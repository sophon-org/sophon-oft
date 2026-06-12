import fs from 'node:fs'
import path from 'node:path'
import { ethers } from 'ethers'

type NetworkName =
	| 'ethereum'
	| 'sophon'
	| 'bsc'
	| 'base'
	| 'polygon'
	| 'arbitrum'
	| 'beam'

type ExecutionMode = 'safe' | 'eoa'

interface PreparedTx {
	network: NetworkName
	chainId: number
	eid: number
	executionMode: ExecutionMode
	safeAddress?: string
	owner?: string
	to: string
	value: string
	function: string
	args: Record<string, unknown>
	data: string
	expectedPostState: string
}

interface PreparedBatch {
	network: NetworkName
	chainId: number
	eid: number
	executionMode: ExecutionMode
	safeAddress?: string
	owner?: string
	transactions: PreparedTx[]
}

interface PreparedBatchFile {
	count: number
	batches: PreparedBatch[]
}

interface EoaCalldataFile {
	owner: string
	batch1StartMigration: { count: number; transactions: PreparedTx[] }
	batch2FinalReconnect: { count: number; transactions: PreparedTx[] }
	ownershipTransferToSafe: { count: number; transactions: PreparedTx[] }
}

interface SafeBuilderTx {
	to: string
	value: string
	data: string
}

interface SafeBuilderFile {
	chainId: string
	meta: { name: string; createdFromSafeAddress: string }
	transactions: SafeBuilderTx[]
}

const OUTPUT_DIR = path.join('safe', 'ethereum-migration', 'prepared-calldata')
const SAFE_BUILDER_DIR = path.join(OUTPUT_DIR, 'safe-transaction-builder')

const ZERO_BYTES32 =
	'0x0000000000000000000000000000000000000000000000000000000000000000'
const SOPHON_EID = 30334
const ETHEREUM_EID = 30101
const ETHEREUM_SAFE = '0x3b181838Ae9DB831C17237FAbD7c10801Dd49fcD'
const SATELLITE_EIDS = new Set([30102, 30184, 30109, 30110, 30198])

const chainNamesByChainId = new Map<number, NetworkName>([
	[1, 'ethereum'],
	[50104, 'sophon'],
	[56, 'bsc'],
	[8453, 'base'],
	[137, 'polygon'],
	[42161, 'arbitrum'],
	[4337, 'beam'],
])

const peerInterface = new ethers.utils.Interface([
	'function setPeer(uint32 eid, bytes32 peer)',
])

const ownershipInterface = new ethers.utils.Interface([
	'function setDelegate(address delegate)',
	'function transferOwnership(address newOwner)',
])

function readJson<T>(file: string): T {
	return JSON.parse(fs.readFileSync(file, 'utf8')) as T
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message)
	}
}

function txKey(tx: { to: string; value: string; data: string }): string {
	return [
		ethers.utils.getAddress(tx.to),
		BigInt(tx.value).toString(),
		tx.data.toLowerCase(),
	].join('|')
}

function getNetworkFromBuilderFile(file: string, builder: SafeBuilderFile) {
	const chainId = Number(builder.chainId)
	const network = chainNamesByChainId.get(chainId)
	assert(network != null, `${file}: unknown chainId ${builder.chainId}`)
	assert(
		file.includes(`-${network}-${chainId}.json`),
		`${file}: filename does not match chainId ${chainId}/${network}`,
	)
	return network
}

function flattenBatches(file: PreparedBatchFile) {
	return file.batches.flatMap((batch) => batch.transactions)
}

function findBatch(
	file: PreparedBatchFile,
	network: NetworkName,
): PreparedBatch | undefined {
	return file.batches.find((batch) => batch.network === network)
}

function verifyCounts(label: string, file: PreparedBatchFile) {
	const actualCount = flattenBatches(file).length
	assert(
		actualCount === file.count,
		`${label}: count is ${file.count}, but ${actualCount} transactions exist`,
	)

	for (const batch of file.batches) {
		if (batch.executionMode === 'safe') {
			assert(
				batch.safeAddress != null,
				`${label}/${batch.network}: missing Safe address`,
			)
		} else {
			assert(
				batch.owner != null,
				`${label}/${batch.network}: missing EOA owner`,
			)
		}
	}
}

function verifyEoaCounts(eoa: EoaCalldataFile) {
	assert(
		eoa.batch1StartMigration.transactions.length ===
			eoa.batch1StartMigration.count,
		`EOA batch 1: count is ${eoa.batch1StartMigration.count}, but ${eoa.batch1StartMigration.transactions.length} transactions exist`,
	)
	assert(
		eoa.batch2FinalReconnect.transactions.length ===
			eoa.batch2FinalReconnect.count,
		`EOA batch 2: count is ${eoa.batch2FinalReconnect.count}, but ${eoa.batch2FinalReconnect.transactions.length} transactions exist`,
	)
	assert(
		eoa.ownershipTransferToSafe.transactions.length ===
			eoa.ownershipTransferToSafe.count,
		`EOA ownership transfer: count is ${eoa.ownershipTransferToSafe.count}, but ${eoa.ownershipTransferToSafe.transactions.length} transactions exist`,
	)
}

function verifyBuilderFiles(
	phase: '01-start' | '02-final',
	aggregate: PreparedBatchFile,
) {
	const files = fs
		.readdirSync(SAFE_BUILDER_DIR)
		.filter((file) => file.startsWith(`${phase}-`) && file.endsWith('.json'))
		.sort()

	const expectedFiles = phase === '01-start' ? 6 : 7
	assert(
		files.length === expectedFiles,
		`${phase}: expected ${expectedFiles} Safe Builder files`,
	)

	let innerCalls = 0
	for (const file of files) {
		const fullPath = path.join(SAFE_BUILDER_DIR, file)
		const builder = readJson<SafeBuilderFile>(fullPath)
		const network = getNetworkFromBuilderFile(file, builder)
		const batch = findBatch(aggregate, network)

		assert(batch != null, `${file}: missing aggregate batch for ${network}`)
		assert(
			batch.executionMode === 'safe',
			`${file}: aggregate batch is not Safe`,
		)
		assert(
			batch.safeAddress?.toLowerCase() ===
				builder.meta.createdFromSafeAddress.toLowerCase(),
			`${file}: Safe address differs from aggregate batch`,
		)
		assert(
			builder.transactions.length === batch.transactions.length,
			`${file}: Builder has ${builder.transactions.length} transactions, aggregate has ${batch.transactions.length}`,
		)

		for (const [index, builderTx] of builder.transactions.entries()) {
			const aggregateTx = batch.transactions[index]
			assert(
				txKey(builderTx) === txKey(aggregateTx),
				`${file}: transaction ${index} does not match aggregate calldata`,
			)
		}

		innerCalls += builder.transactions.length
	}

	return { safeTxCount: files.length, innerCalls }
}

function decodePeerTx(
	tx: PreparedTx,
): { eid: number; peer: string } | undefined {
	if (!tx.data.startsWith(peerInterface.getSighash('setPeer'))) return undefined
	const [eid, peer] = peerInterface.decodeFunctionData('setPeer', tx.data) as [
		number,
		string,
	]
	return { eid: Number(eid), peer }
}

function decodeOwnershipTx(
	tx: PreparedTx,
): { functionName: string; address: string } | undefined {
	if (tx.data.startsWith(ownershipInterface.getSighash('setDelegate'))) {
		const [delegate] = ownershipInterface.decodeFunctionData(
			'setDelegate',
			tx.data,
		) as [string]
		return {
			functionName: 'setDelegate',
			address: ethers.utils.getAddress(delegate),
		}
	}

	if (tx.data.startsWith(ownershipInterface.getSighash('transferOwnership'))) {
		const [newOwner] = ownershipInterface.decodeFunctionData(
			'transferOwnership',
			tx.data,
		) as [string]
		return {
			functionName: 'transferOwnership',
			address: ethers.utils.getAddress(newOwner),
		}
	}

	return undefined
}

function verifyOwnershipTransfer(eoa: EoaCalldataFile) {
	const txs = eoa.ownershipTransferToSafe.transactions
	assert(txs.length === 2, 'ownership handoff: expected 2 EOA calls')

	const decoded = txs.map(decodeOwnershipTx)
	assert(
		decoded[0]?.functionName === 'setDelegate' &&
			decoded[0].address === ETHEREUM_SAFE,
		'ownership handoff: first call must setDelegate(Ethereum Safe)',
	)
	assert(
		decoded[1]?.functionName === 'transferOwnership' &&
			decoded[1].address === ETHEREUM_SAFE,
		'ownership handoff: second call must transferOwnership(Ethereum Safe)',
	)
}

function verifyNoSatelliteToSatellitePeerWrites(txs: PreparedTx[]) {
	const badWrites = txs.filter((tx) => {
		const decoded = decodePeerTx(tx)
		return (
			decoded != null &&
			SATELLITE_EIDS.has(tx.eid) &&
			SATELLITE_EIDS.has(decoded.eid)
		)
	})

	assert(
		badWrites.length === 0,
		`found ${badWrites.length} satellite-to-satellite peer writes`,
	)
}

function verifyMigrationScope(
	start: PreparedBatchFile,
	final: PreparedBatchFile,
	eoa: EoaCalldataFile,
) {
	const startTxs = flattenBatches(start)
	const finalTxs = flattenBatches(final)
	verifyNoSatelliteToSatellitePeerWrites([...startTxs, ...finalTxs])

	const batch1PeerWrites = startTxs
		.map((tx) => ({ tx, decoded: decodePeerTx(tx) }))
		.filter(({ decoded }) => decoded != null)

	const batch1SophonSatelliteClears = batch1PeerWrites.filter(
		({ tx, decoded }) =>
			tx.eid === SOPHON_EID &&
			decoded != null &&
			SATELLITE_EIDS.has(decoded.eid) &&
			decoded.peer === ZERO_BYTES32,
	)
	const batch1SatelliteSophonClears = batch1PeerWrites.filter(
		({ tx, decoded }) =>
			SATELLITE_EIDS.has(tx.eid) &&
			decoded?.eid === SOPHON_EID &&
			decoded.peer === ZERO_BYTES32,
	)
	const batch1SophonEthereumSet = batch1PeerWrites.filter(
		({ tx, decoded }) =>
			tx.eid === SOPHON_EID &&
			decoded?.eid === ETHEREUM_EID &&
			decoded.peer !== ZERO_BYTES32,
	)
	const batch1EthereumSophonSet = eoa.batch1StartMigration.transactions.filter(
		(tx) => {
			const decoded = decodePeerTx(tx)
			return (
				tx.eid === ETHEREUM_EID &&
				decoded?.eid === SOPHON_EID &&
				decoded.peer !== ZERO_BYTES32
			)
		},
	)

	assert(
		batch1SophonSatelliteClears.length === SATELLITE_EIDS.size,
		`batch 1: expected ${SATELLITE_EIDS.size} Sophon -> satellite clears`,
	)
	assert(
		batch1SatelliteSophonClears.length === SATELLITE_EIDS.size,
		`batch 1: expected ${SATELLITE_EIDS.size} satellite -> Sophon clears`,
	)
	assert(
		batch1SophonEthereumSet.length === 1,
		'batch 1: expected one Sophon -> Ethereum peer set',
	)
	assert(
		batch1EthereumSophonSet.length === 1,
		'batch 1: expected one Ethereum -> Sophon peer set in EOA calldata',
	)

	const batch2PeerWrites = finalTxs
		.map((tx) => ({ tx, decoded: decodePeerTx(tx) }))
		.filter(({ decoded }) => decoded != null)
	const batch2SophonEthereumClears = batch2PeerWrites.filter(
		({ tx, decoded }) =>
			tx.eid === SOPHON_EID &&
			decoded?.eid === ETHEREUM_EID &&
			decoded.peer === ZERO_BYTES32,
	)
	const batch2EthereumSophonClears = batch2PeerWrites.filter(
		({ tx, decoded }) =>
			tx.eid === ETHEREUM_EID &&
			decoded?.eid === SOPHON_EID &&
			decoded.peer === ZERO_BYTES32,
	)
	const batch2SatelliteEthereumSets = batch2PeerWrites.filter(
		({ tx, decoded }) =>
			SATELLITE_EIDS.has(tx.eid) &&
			decoded?.eid === ETHEREUM_EID &&
			decoded.peer !== ZERO_BYTES32,
	)
	const batch2EthereumSatelliteSets = batch2PeerWrites.filter(
		({ tx, decoded }) =>
			tx.eid === ETHEREUM_EID &&
			decoded != null &&
			SATELLITE_EIDS.has(decoded.eid) &&
			decoded.peer !== ZERO_BYTES32,
	)

	assert(
		batch2SophonEthereumClears.length === 1,
		'batch 2: expected one Sophon -> Ethereum peer clear',
	)
	assert(
		batch2EthereumSophonClears.length === 1,
		'batch 2: expected one Ethereum -> Sophon peer clear in Safe calldata',
	)
	assert(
		batch2SatelliteEthereumSets.length === SATELLITE_EIDS.size,
		`batch 2: expected ${SATELLITE_EIDS.size} satellite -> Ethereum peer sets`,
	)
	assert(
		batch2EthereumSatelliteSets.length === SATELLITE_EIDS.size,
		`batch 2: expected ${SATELLITE_EIDS.size} Ethereum -> satellite peer sets in Safe calldata`,
	)
	assert(
		eoa.batch2FinalReconnect.count === 0,
		'batch 2: expected zero Ethereum EOA calls',
	)
}

function main() {
	const start = readJson<PreparedBatchFile>(
		path.join(OUTPUT_DIR, '01-start-migration-batch.json'),
	)
	const final = readJson<PreparedBatchFile>(
		path.join(OUTPUT_DIR, '02-final-reconnect-batch.json'),
	)
	const eoa = readJson<EoaCalldataFile>(
		path.join(OUTPUT_DIR, '03-ethereum-eoa-calldata.json'),
	)

	verifyCounts('batch 1', start)
	verifyCounts('batch 2', final)
	verifyEoaCounts(eoa)
	verifyOwnershipTransfer(eoa)
	verifyMigrationScope(start, final, eoa)

	const startSafe = verifyBuilderFiles('01-start', start)
	const finalSafe = verifyBuilderFiles('02-final', final)
	const totalSafeTxs = startSafe.safeTxCount + finalSafe.safeTxCount
	const totalSafeInnerCalls = startSafe.innerCalls + finalSafe.innerCalls

	console.log('Migration Safe transaction verification passed.')
	console.log(
		`Batch 1: ${startSafe.safeTxCount} Safe txs, ${startSafe.innerCalls} inner calls, ${eoa.batch1StartMigration.count} Ethereum EOA calls.`,
	)
	console.log(
		`Batch 2: ${finalSafe.safeTxCount} Safe txs, ${finalSafe.innerCalls} inner calls, ${eoa.batch2FinalReconnect.count} Ethereum EOA calls.`,
	)
	console.log(
		`Ownership handoff: ${eoa.ownershipTransferToSafe.count} Ethereum EOA calls.`,
	)
	console.log(
		`Total Safe signing surface: ${totalSafeTxs} Safe txs, ${totalSafeInnerCalls} inner calls.`,
	)
	console.log(
		'Scope checked: no satellite-to-satellite peer writes; only Sophon <-> satellite disconnects and Ethereum <-> satellite final links.',
	)
}

main()
