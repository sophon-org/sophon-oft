import fs from 'node:fs'
import path from 'node:path'
import { Options } from '@layerzerolabs/lz-v2-utilities'
import { generateConnectionsConfig } from '@layerzerolabs/metadata-tools'
import { ethers } from 'ethers'
import {
	currentSophonSatellitePathways,
	finalEthereumSatellitePathways,
	sophonToEthereumMigrationPathways,
} from '../layerzero.config.shared'

type NetworkName =
	| 'ethereum'
	| 'sophon'
	| 'bsc'
	| 'base'
	| 'polygon'
	| 'arbitrum'
	| 'beam'

type ContractKey = `${NetworkName}:${string}`
type NumberLike = bigint | number | string

interface SetConfigParam {
	eid: number
	configType: number
	config: string
}

interface LzReceiveEnforcedOption {
	msgType: number
	gas?: NumberLike
	value?: NumberLike
}

interface GeneratedConnectionConfig {
	sendLibrary?: string
	receiveLibraryConfig?: {
		receiveLibrary?: string
		gracePeriod?: NumberLike
	}
	sendConfig?: {
		executorConfig?: { maxMessageSize: number; executor: string }
		ulnConfig?: unknown
	}
	receiveConfig?: {
		ulnConfig?: unknown
	}
	enforcedOptions?: LzReceiveEnforcedOption[]
}

type SetConfigArgs = Record<string, unknown> & {
	oapp: string
	messageLibrary: string
	direction: 'send' | 'receive'
	params: SetConfigParam[]
	remoteEids?: number[]
}

type EnforcedOptionsArgs = Record<string, unknown> & {
	enforcedOptions: { eid: number; msgType: number; options: string }[]
	remoteEids?: number[]
}

interface ChainInfo {
	chainId: number
	eid: number
	network: NetworkName
	label: string
	endpoint: string
	safeAddress?: string
	executionMode: 'safe' | 'eoa'
	owner?: string
}

interface PreparedTx {
	network: NetworkName
	chainId: number
	eid: number
	executionMode: 'safe' | 'eoa'
	safeAddress?: string
	owner?: string
	to: string
	value: '0'
	function: string
	args: Record<string, unknown>
	data: string
	expectedPostState: string
	safeBuilder?: {
		contractMethod: {
			inputs: { internalType: string; name: string; type: string }[]
			name: string
			payable: false
		}
		contractInputsValues: Record<string, string>
	}
}

interface TxBatch<T> {
	network: NetworkName
	chainId: number
	eid: number
	executionMode: 'safe' | 'eoa'
	safeAddress?: string
	owner?: string
	transactions: T[]
}

interface PointLike {
	eid: number
	contractName?: string | null
}

const OUTPUT_DIR = path.join('safe', 'ethereum-migration', 'prepared-calldata')

const ZERO_BYTES32 =
	'0x0000000000000000000000000000000000000000000000000000000000000000'

const ETHEREUM_OWNER = '0x50B238788747B26c408681283D148659F9da7Cf9'
const ETHEREUM_SAFE = '0x3b181838Ae9DB831C17237FAbD7c10801Dd49fcD'
const ETHEREUM_ADAPTER = '0xb09F17b1c52DCC6870070047e1D84e3Aab1c4DD1'

const CONFIG_TYPE_EXECUTOR = 1
const CONFIG_TYPE_ULN = 2
const TX_BUILDER_VERSION = '1.18.0'

const chainsByEid = new Map<number, ChainInfo>([
	[
		30101,
		{
			chainId: 1,
			eid: 30101,
			network: 'ethereum',
			label: 'Ethereum',
			endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
			executionMode: 'eoa',
			owner: ETHEREUM_OWNER,
		},
	],
	[
		30334,
		{
			chainId: 50104,
			eid: 30334,
			network: 'sophon',
			label: 'Sophon',
			endpoint: '0x5c6cfF4b7C49805F8295Ff73C204ac83f3bC4AE7',
			executionMode: 'safe',
			safeAddress: '0xa3b1f968b608642dD16d7Fd31bEc0B2c915908dB',
		},
	],
	[
		30102,
		{
			chainId: 56,
			eid: 30102,
			network: 'bsc',
			label: 'BSC',
			endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
			executionMode: 'safe',
			safeAddress: '0x3b181838Ae9DB831C17237FAbD7c10801Dd49fcD',
		},
	],
	[
		30184,
		{
			chainId: 8453,
			eid: 30184,
			network: 'base',
			label: 'Base',
			endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
			executionMode: 'safe',
			safeAddress: '0x3b181838Ae9DB831C17237FAbD7c10801Dd49fcD',
		},
	],
	[
		30109,
		{
			chainId: 137,
			eid: 30109,
			network: 'polygon',
			label: 'Polygon',
			endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
			executionMode: 'safe',
			safeAddress: '0x3b181838Ae9DB831C17237FAbD7c10801Dd49fcD',
		},
	],
	[
		30110,
		{
			chainId: 42161,
			eid: 30110,
			network: 'arbitrum',
			label: 'Arbitrum',
			endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
			executionMode: 'safe',
			safeAddress: '0x3b181838Ae9DB831C17237FAbD7c10801Dd49fcD',
		},
	],
	[
		30198,
		{
			chainId: 4337,
			eid: 30198,
			network: 'beam',
			label: 'Beam',
			endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
			executionMode: 'safe',
			safeAddress: '0xa72D557fB4E4A1a662fCE7cf506Ff593E5c90D3b',
		},
	],
])

const deploymentByContract: Record<ContractKey, string> = {
	'ethereum:SophonTokenOFTAdapter': ETHEREUM_ADAPTER,
	'sophon:SophonTokenOFTAdapter': '0x70ff61C1436d19090321A312b1f4be89D62ac55C',
	'bsc:SophonTokenOFT': '0x31DbA3c96481FDe3CD81C2aaF51F2D8bf618C742',
	'base:SophonTokenOFT': '0x31DbA3c96481FDe3CD81C2aaF51F2D8bf618C742',
	'polygon:SophonTokenOFT': '0xEb971Fd26783f32694dbB392dD7289de23109148',
	'arbitrum:SophonTokenOFT': '0x31DbA3c96481FDe3CD81C2aaF51F2D8bf618C742',
	'beam:SophonTokenOFT': '0x31DbA3c96481FDe3CD81C2aaF51F2D8bf618C742',
}

const peerInterface = new ethers.utils.Interface([
	'function setPeer(uint32 eid, bytes32 peer)',
])

const endpointInterface = new ethers.utils.Interface([
	'function setSendLibrary(address oapp, uint32 eid, address newLib)',
	'function setReceiveLibrary(address oapp, uint32 eid, address newLib, uint256 gracePeriod)',
	'function setConfig(address _oapp, address _lib, tuple(uint32 eid, uint32 configType, bytes config)[] _params)',
])

const oappInterface = new ethers.utils.Interface([
	'function setEnforcedOptions(tuple(uint32 eid, uint16 msgType, bytes options)[] enforcedOptions)',
])

const ownershipInterface = new ethers.utils.Interface([
	'function setDelegate(address delegate)',
	'function transferOwnership(address newOwner)',
])

const ulnConfigCoder = new ethers.utils.Interface([
	'function encode((uint64 confirmations,uint8 requiredDVNCount,uint8 optionalDVNCount,uint8 optionalDVNThreshold,address[] requiredDVNs,address[] optionalDVNs) config)',
])

const executorConfigCoder = new ethers.utils.Interface([
	'function encode((uint32 maxMessageSize,address executor) config)',
])

function getChain(eid: number): ChainInfo {
	const chain = chainsByEid.get(eid)
	if (chain == null) {
		throw new Error(`Missing chain info for EID ${eid}`)
	}
	return chain
}

function getDeployment(eid: number, contractName: string): string {
	const chain = getChain(eid)
	const address = deploymentByContract[`${chain.network}:${contractName}`]
	if (address == null) {
		throw new Error(`Missing deployment for ${chain.network}:${contractName}`)
	}
	return ethers.utils.getAddress(address)
}

function toPeer(address: string): string {
	return ethers.utils.hexZeroPad(ethers.utils.getAddress(address), 32)
}

function encodeSetPeer(remoteEid: number, peer: string): string {
	return peerInterface.encodeFunctionData('setPeer', [remoteEid, peer])
}

function encodeEnforcedOptions(
	options: (LzReceiveEnforcedOption & { gas: NumberLike })[],
): { msgType: number; options: string }[] {
	return options.map((option) => ({
		msgType: option.msgType,
		options: Options.newOptions()
			.addExecutorLzReceiveOption(
				option.gas.toString(),
				(option.value ?? 0).toString(),
			)
			.toHex(),
	}))
}

function sortedAddresses(addresses: string[]): string[] {
	return addresses
		.map((address) => ethers.utils.getAddress(address))
		.sort((a, b) => {
			const aValue = BigInt(a)
			const bValue = BigInt(b)
			return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
		})
}

function encodeUlnConfig(config: {
	confirmations: bigint | number | string
	requiredDVNs: string[]
	optionalDVNs: string[]
	optionalDVNThreshold: number
}): string {
	const requiredDVNs = sortedAddresses(config.requiredDVNs)
	const optionalDVNs = sortedAddresses(config.optionalDVNs)
	const data = ulnConfigCoder.encodeFunctionData('encode', [
		{
			confirmations: config.confirmations,
			requiredDVNCount: requiredDVNs.length,
			optionalDVNCount: optionalDVNs.length,
			optionalDVNThreshold: config.optionalDVNThreshold,
			requiredDVNs,
			optionalDVNs,
		},
	])

	return `0x${data.slice(10)}`
}

function encodeExecutorConfig(config: {
	maxMessageSize: number
	executor: string
}): string {
	const data = executorConfigCoder.encodeFunctionData('encode', [
		{
			maxMessageSize: config.maxMessageSize,
			executor: ethers.utils.getAddress(config.executor),
		},
	])

	return `0x${data.slice(10)}`
}

function requireContractName(contractName: string | null | undefined): string {
	if (contractName == null) {
		throw new Error('Connection is missing contractName')
	}
	return contractName
}

function requireUlnConfig(
	config: unknown,
	context: string,
): {
	confirmations: bigint | number | string
	requiredDVNs: string[]
	optionalDVNs: string[]
	optionalDVNThreshold: number
} {
	const value = config as {
		confirmations?: bigint | number | string
		requiredDVNs?: string[]
		optionalDVNs?: string[]
		optionalDVNThreshold?: number
	}

	if (
		value.confirmations == null ||
		value.requiredDVNs == null ||
		value.optionalDVNs == null ||
		value.optionalDVNThreshold == null
	) {
		throw new Error(`Incomplete ULN config for ${context}`)
	}

	return {
		confirmations: value.confirmations,
		requiredDVNs: value.requiredDVNs,
		optionalDVNs: value.optionalDVNs,
		optionalDVNThreshold: value.optionalDVNThreshold,
	}
}

function makeTxBase(
	chain: ChainInfo,
	to: string,
	fn: string,
	args: Record<string, unknown>,
	data: string,
	expectedPostState: string,
	safeBuilder?: PreparedTx['safeBuilder'],
): PreparedTx {
	return {
		network: chain.network,
		chainId: chain.chainId,
		eid: chain.eid,
		executionMode: chain.executionMode,
		safeAddress: chain.safeAddress,
		owner: chain.owner,
		to,
		value: '0',
		function: fn,
		args,
		data,
		expectedPostState,
		safeBuilder,
	}
}

function makePeerTx(from: PointLike, to: PointLike, peer: string): PreparedTx {
	const fromChain = getChain(from.eid)
	const toChain = getChain(to.eid)
	const local = getDeployment(from.eid, requireContractName(from.contractName))
	const remote = getDeployment(to.eid, requireContractName(to.contractName))

	return makeTxBase(
		fromChain,
		local,
		'setPeer(uint32,bytes32)',
		{
			eid: toChain.eid,
			peer,
			remoteNetwork: toChain.network,
			remoteContract: remote,
		},
		encodeSetPeer(toChain.eid, peer),
		`peers(${toChain.eid}) == ${peer}`,
		{
			contractMethod: {
				inputs: [
					{
						internalType: 'uint32',
						name: 'eid',
						type: 'uint32',
					},
					{
						internalType: 'bytes32',
						name: 'peer',
						type: 'bytes32',
					},
				],
				name: 'setPeer',
				payable: false,
			},
			contractInputsValues: {
				eid: String(toChain.eid),
				peer,
			},
		},
	)
}

function makeConfigTxs(connection: {
	from: PointLike
	to: PointLike
	config?: GeneratedConnectionConfig
}): PreparedTx[] {
	if (connection.config == null) return []

	const fromChain = getChain(connection.from.eid)
	const toChain = getChain(connection.to.eid)
	const oapp = getDeployment(
		connection.from.eid,
		requireContractName(connection.from.contractName),
	)
	const txs: PreparedTx[] = []

	if (connection.config.sendLibrary != null) {
		const newLib = ethers.utils.getAddress(connection.config.sendLibrary)
		txs.push(
			makeTxBase(
				fromChain,
				fromChain.endpoint,
				'setSendLibrary(address,uint32,address)',
				{
					oapp,
					remoteEid: toChain.eid,
					remoteNetwork: toChain.network,
					newLib,
				},
				endpointInterface.encodeFunctionData('setSendLibrary', [
					oapp,
					toChain.eid,
					newLib,
				]),
				`sendLibrary(${oapp}, ${toChain.eid}) == ${newLib}`,
			),
		)
	}

	if (connection.config.receiveLibraryConfig?.receiveLibrary != null) {
		const newLib = ethers.utils.getAddress(
			connection.config.receiveLibraryConfig.receiveLibrary,
		)
		const gracePeriod =
			connection.config.receiveLibraryConfig.gracePeriod?.toString() ?? '0'
		txs.push(
			makeTxBase(
				fromChain,
				fromChain.endpoint,
				'setReceiveLibrary(address,uint32,address,uint256)',
				{
					oapp,
					remoteEid: toChain.eid,
					remoteNetwork: toChain.network,
					newLib,
					gracePeriod,
				},
				endpointInterface.encodeFunctionData('setReceiveLibrary', [
					oapp,
					toChain.eid,
					newLib,
					gracePeriod,
				]),
				`receiveLibrary(${oapp}, ${toChain.eid}) == ${newLib}`,
			),
		)
	}

	if (connection.config.sendConfig != null) {
		if (connection.config.sendConfig.executorConfig == null) {
			throw new Error(`Missing executorConfig for ${fromChain.network}`)
		}
		if (connection.config.sendConfig.ulnConfig == null) {
			throw new Error(`Missing send ulnConfig for ${fromChain.network}`)
		}
		if (connection.config.sendLibrary == null) {
			throw new Error(`Missing sendLibrary for ${fromChain.network}`)
		}

		const messageLibrary = ethers.utils.getAddress(
			connection.config.sendLibrary,
		)
		const params = [
			{
				eid: toChain.eid,
				configType: CONFIG_TYPE_EXECUTOR,
				config: encodeExecutorConfig(
					connection.config.sendConfig.executorConfig,
				),
			},
			{
				eid: toChain.eid,
				configType: CONFIG_TYPE_ULN,
				config: encodeUlnConfig(
					requireUlnConfig(
						connection.config.sendConfig.ulnConfig,
						`${fromChain.network} -> ${toChain.network}`,
					),
				),
			},
		]

		txs.push(
			makeTxBase(
				fromChain,
				fromChain.endpoint,
				'setConfig(address,address,(uint32,uint32,bytes)[])',
				{
					oapp,
					messageLibrary,
					remoteEid: toChain.eid,
					remoteNetwork: toChain.network,
					direction: 'send',
					params,
				} satisfies SetConfigArgs,
				endpointInterface.encodeFunctionData('setConfig', [
					oapp,
					messageLibrary,
					params,
				]),
				`send config for ${toChain.eid} is set`,
			),
		)
	}

	if (connection.config.receiveConfig != null) {
		if (connection.config.receiveConfig.ulnConfig == null) {
			throw new Error(`Missing receive ulnConfig for ${fromChain.network}`)
		}
		if (connection.config.receiveLibraryConfig?.receiveLibrary == null) {
			throw new Error(`Missing receiveLibrary for ${fromChain.network}`)
		}

		const messageLibrary = ethers.utils.getAddress(
			connection.config.receiveLibraryConfig.receiveLibrary,
		)
		const params = [
			{
				eid: toChain.eid,
				configType: CONFIG_TYPE_ULN,
				config: encodeUlnConfig(
					requireUlnConfig(
						connection.config.receiveConfig.ulnConfig,
						`${fromChain.network} <- ${toChain.network}`,
					),
				),
			},
		]

		txs.push(
			makeTxBase(
				fromChain,
				fromChain.endpoint,
				'setConfig(address,address,(uint32,uint32,bytes)[])',
				{
					oapp,
					messageLibrary,
					remoteEid: toChain.eid,
					remoteNetwork: toChain.network,
					direction: 'receive',
					params,
				} satisfies SetConfigArgs,
				endpointInterface.encodeFunctionData('setConfig', [
					oapp,
					messageLibrary,
					params,
				]),
				`receive config for ${toChain.eid} is set`,
			),
		)
	}

	if (connection.config.enforcedOptions != null) {
		const enforcedOptions = encodeEnforcedOptions(
			connection.config.enforcedOptions.filter(
				(option): option is LzReceiveEnforcedOption & { gas: NumberLike } =>
					option.gas != null,
			),
		).map((option) => ({
			eid: toChain.eid,
			msgType: option.msgType,
			options: option.options,
		}))

		txs.push(
			makeTxBase(
				fromChain,
				oapp,
				'setEnforcedOptions((uint32,uint16,bytes)[])',
				{
					remoteEid: toChain.eid,
					remoteNetwork: toChain.network,
					enforcedOptions,
				} satisfies EnforcedOptionsArgs,
				oappInterface.encodeFunctionData('setEnforcedOptions', [
					enforcedOptions,
				]),
				`enforced options for ${toChain.eid} are set`,
			),
		)
	}

	return txs
}

function isSetConfigTx(tx: PreparedTx): tx is PreparedTx & {
	args: SetConfigArgs
} {
	return tx.function === 'setConfig(address,address,(uint32,uint32,bytes)[])'
}

function isSetEnforcedOptionsTx(tx: PreparedTx): tx is PreparedTx & {
	args: EnforcedOptionsArgs
} {
	return tx.function === 'setEnforcedOptions((uint32,uint16,bytes)[])'
}

function cloneTx(tx: PreparedTx): PreparedTx {
	return {
		...tx,
		args: JSON.parse(JSON.stringify(tx.args)),
	}
}

function coalesceBatchableTxs(txs: PreparedTx[]): PreparedTx[] {
	const result: PreparedTx[] = []
	const setConfigByKey = new Map<string, PreparedTx & { args: SetConfigArgs }>()
	const enforcedOptionsByKey = new Map<
		string,
		PreparedTx & { args: EnforcedOptionsArgs }
	>()

	for (const tx of txs) {
		if (isSetConfigTx(tx)) {
			const key = [
				tx.network,
				tx.to,
				tx.args.oapp,
				tx.args.messageLibrary,
				tx.args.direction,
			].join('|')
			const existing = setConfigByKey.get(key)

			if (existing == null) {
				const next = cloneTx(tx) as PreparedTx & { args: SetConfigArgs }
				next.args.remoteEids = next.args.params.map((param) => param.eid)
				setConfigByKey.set(key, next)
				result.push(next)
				continue
			}

			existing.args.params.push(...tx.args.params)
			existing.args.remoteEids = existing.args.params.map((param) => param.eid)
			existing.data = endpointInterface.encodeFunctionData('setConfig', [
				existing.args.oapp,
				existing.args.messageLibrary,
				existing.args.params,
			])
			existing.expectedPostState = `${existing.args.direction} config for ${existing.args.remoteEids.join(', ')} is set`
			continue
		}

		if (isSetEnforcedOptionsTx(tx)) {
			const key = [tx.network, tx.to].join('|')
			const existing = enforcedOptionsByKey.get(key)

			if (existing == null) {
				const next = cloneTx(tx) as PreparedTx & {
					args: EnforcedOptionsArgs
				}
				next.args.remoteEids = next.args.enforcedOptions.map(
					(option) => option.eid,
				)
				enforcedOptionsByKey.set(key, next)
				result.push(next)
				continue
			}

			existing.args.enforcedOptions.push(...tx.args.enforcedOptions)
			existing.args.remoteEids = existing.args.enforcedOptions.map(
				(option) => option.eid,
			)
			existing.data = oappInterface.encodeFunctionData('setEnforcedOptions', [
				existing.args.enforcedOptions,
			])
			existing.expectedPostState = `enforced options for ${existing.args.remoteEids.join(', ')} are set`
			continue
		}

		result.push(tx)
	}

	return result
}

function groupByNetwork<T extends PreparedTx>(txs: T[]): TxBatch<T>[] {
	return [...chainsByEid.values()].flatMap((chain) => {
		const transactions = txs.filter((tx) => tx.network === chain.network)
		if (transactions.length === 0) return []
		const executionMode = transactions[0].executionMode
		const safeAddress = transactions[0].safeAddress
		const owner = transactions[0].owner

		for (const tx of transactions) {
			if (
				tx.executionMode !== executionMode ||
				tx.safeAddress !== safeAddress ||
				tx.owner !== owner
			) {
				throw new Error(`Mixed ownership modes in ${chain.network} batch`)
			}
		}

		return [
			{
				network: chain.network,
				chainId: chain.chainId,
				eid: chain.eid,
				executionMode,
				safeAddress,
				owner,
				transactions,
			},
		]
	})
}

function moveEthereumTxsToSafe(txs: PreparedTx[]): PreparedTx[] {
	return txs.map((tx) => {
		if (tx.network !== 'ethereum') return tx

		const { owner: _owner, ...rest } = tx
		return {
			...rest,
			executionMode: 'safe',
			safeAddress: ETHEREUM_SAFE,
		}
	})
}

function makeEthereumOwnershipTransferTxs(): PreparedTx[] {
	const chain = getChain(30101)

	return [
		makeTxBase(
			chain,
			ETHEREUM_ADAPTER,
			'setDelegate(address)',
			{ delegate: ETHEREUM_SAFE },
			ownershipInterface.encodeFunctionData('setDelegate', [ETHEREUM_SAFE]),
			`delegate == ${ETHEREUM_SAFE}`,
		),
		makeTxBase(
			chain,
			ETHEREUM_ADAPTER,
			'transferOwnership(address)',
			{ newOwner: ETHEREUM_SAFE },
			ownershipInterface.encodeFunctionData('transferOwnership', [
				ETHEREUM_SAFE,
			]),
			`owner() == ${ETHEREUM_SAFE}`,
		),
	]
}

function makeSafeBuilderBatch(
	name: string,
	description: string,
	batch: TxBatch<PreparedTx>,
) {
	if (batch.executionMode !== 'safe' || batch.safeAddress == null) {
		throw new Error(`Cannot create Safe builder batch for ${batch.network}`)
	}

	return {
		version: '1.0',
		chainId: String(batch.chainId),
		createdAt: 0,
		meta: {
			name,
			description,
			txBuilderVersion: TX_BUILDER_VERSION,
			createdFromSafeAddress: batch.safeAddress,
			createdFromOwnerAddress: '',
		},
		transactions: batch.transactions.map((tx) => ({
			to: tx.to,
			value: tx.value,
			data: tx.data,
			contractMethod: tx.safeBuilder?.contractMethod,
			contractInputsValues: tx.safeBuilder?.contractInputsValues,
		})),
	}
}

function writeSafeBuilderFiles(
	phase: '01-start' | '02-final',
	description: string,
	batches: TxBatch<PreparedTx>[],
) {
	for (const batch of batches) {
		if (batch.executionMode !== 'safe') continue

		writeJson(
			path.join(
				'safe-transaction-builder',
				`${phase}-${batch.network}-${batch.chainId}.json`,
			),
			makeSafeBuilderBatch(
				`SOPH migration ${phase} ${batch.network}`,
				description,
				batch,
			),
		)
	}
}

function writeJson(file: string, value: unknown) {
	fs.mkdirSync(OUTPUT_DIR, { recursive: true })
	fs.mkdirSync(path.dirname(path.join(OUTPUT_DIR, file)), { recursive: true })
	fs.writeFileSync(
		path.join(OUTPUT_DIR, file),
		`${JSON.stringify(value, null, '\t')}\n`,
	)
}

function writeText(file: string, value: string) {
	fs.mkdirSync(OUTPUT_DIR, { recursive: true })
	fs.mkdirSync(path.dirname(path.join(OUTPUT_DIR, file)), { recursive: true })
	fs.writeFileSync(path.join(OUTPUT_DIR, file), value)
}

async function main() {
	fs.rmSync(OUTPUT_DIR, { recursive: true, force: true })

	const currentSophonSatelliteConnections = await generateConnectionsConfig(
		currentSophonSatellitePathways,
	)
	const migrationConnections = await generateConnectionsConfig(
		sophonToEthereumMigrationPathways,
	)
	const finalEthereumSatelliteConnections = await generateConnectionsConfig(
		finalEthereumSatellitePathways,
	)

	const disconnectTxs = currentSophonSatelliteConnections.map((connection) =>
		makePeerTx(connection.from, connection.to, ZERO_BYTES32),
	)
	const migrationPeerTxs = migrationConnections.map((connection) => {
		const remote = getDeployment(
			connection.to.eid,
			requireContractName(connection.to.contractName),
		)
		return makePeerTx(connection.from, connection.to, toPeer(remote))
	})
	const migrationConfigTxs = migrationConnections.flatMap(makeConfigTxs)

	const reconnectTxs = finalEthereumSatelliteConnections.map((connection) => {
		const remote = getDeployment(
			connection.to.eid,
			requireContractName(connection.to.contractName),
		)
		return makePeerTx(connection.from, connection.to, toPeer(remote))
	})
	const finalConfigTxs =
		finalEthereumSatelliteConnections.flatMap(makeConfigTxs)
	const clearTemporaryPeerTxs = migrationConnections.map((connection) =>
		makePeerTx(connection.from, connection.to, ZERO_BYTES32),
	)

	const startTxs = coalesceBatchableTxs([
		...disconnectTxs,
		...migrationConfigTxs,
		...migrationPeerTxs,
	])
	const finalTxs = moveEthereumTxsToSafe(
		coalesceBatchableTxs([
			...clearTemporaryPeerTxs,
			...finalConfigTxs,
			...reconnectTxs,
		]),
	)

	const startBatches = groupByNetwork(startTxs)
	const finalBatches = groupByNetwork(finalTxs)
	const ethereumStartTxs = startTxs.filter(
		(tx) => tx.network === 'ethereum' && tx.executionMode === 'eoa',
	)
	const ethereumFinalTxs = finalTxs.filter(
		(tx) => tx.network === 'ethereum' && tx.executionMode === 'eoa',
	)
	const ethereumOwnershipTransferTxs = makeEthereumOwnershipTransferTxs()

	writeJson('01-start-migration-batch.json', {
		description:
			'Batch 1: disconnect Sophon <-> satellite peers, configure the temporary Sophon <-> Ethereum migration route, and set the Sophon/Ethereum peers for that route.',
		count: startTxs.length,
		batches: startBatches,
	})

	writeJson('02-final-reconnect-batch.json', {
		description:
			'Batch 2: clear the temporary Sophon/Ethereum peer route, configure Ethereum <-> satellite final-route security settings, and connect Ethereum <-> satellite peers.',
		count: finalTxs.length,
		batches: finalBatches,
	})

	writeJson('03-ethereum-eoa-calldata.json', {
		description:
			'Ethereum EOA-owned calldata. Execute batch1 when migration starts. Batch2 Ethereum calls are Safe-owned after ownership transfer.',
		owner: ETHEREUM_OWNER,
		batch1StartMigration: {
			count: ethereumStartTxs.length,
			transactions: ethereumStartTxs,
		},
		batch2FinalReconnect: {
			count: ethereumFinalTxs.length,
			transactions: ethereumFinalTxs,
		},
		ownershipTransferToSafe: {
			count: ethereumOwnershipTransferTxs.length,
			transactions: ethereumOwnershipTransferTxs,
		},
	})

	writeText(
		'README.md',
		`# Prepared Ethereum Migration Transactions

Generated by:

\`\`\`bash
pnpm exec ts-node scripts/generateMigrationCalldata.ts
\`\`\`

This directory is the only prepared transaction set for the Ethereum OFT
migration.

Files:

- \`01-start-migration-batch.json\`: all batch 1 transactions, grouped by chain.
- \`02-final-reconnect-batch.json\`: all batch 2 transactions, grouped by chain.
- \`03-ethereum-eoa-calldata.json\`: Ethereum owner EOA calldata for batch 1
  and the ownership/delegate handoff to the Ethereum Safe.
- \`safe-transaction-builder/01-start-*.json\`: Safe Transaction Builder imports
  for batch 1.
- \`safe-transaction-builder/02-final-*.json\`: Safe Transaction Builder imports
  for batch 2.

Batch 1 is executed when the migration starts. It disconnects Sophon <->
satellite peers in both directions and configures the temporary Sophon <->
Ethereum migration route.

Batch 2 is executed only after the migration is complete, verified, and the
Ethereum adapter owner/delegate has been transferred to the Ethereum Safe. It
clears the temporary Sophon/Ethereum peer route and connects Ethereum <->
satellite peers in both directions.

Ethereum adapter transactions are EOA calldata while
\`0xb09F17b1c52DCC6870070047e1D84e3Aab1c4DD1\` remains owned by
\`0x50B238788747B26c408681283D148659F9da7Cf9\`. Batch 2 Ethereum calls are Safe
transactions for \`0x3b181838Ae9DB831C17237FAbD7c10801Dd49fcD\`.
`,
	)

	writeSafeBuilderFiles(
		'01-start',
		'Batch 1: disconnect Sophon <-> satellite peers on this chain and configure any Safe-owned temporary Sophon <-> Ethereum migration route calls. Execute only when ready to begin migration.',
		startBatches,
	)
	writeSafeBuilderFiles(
		'02-final',
		'Batch 2: connect Ethereum <-> satellite final-route calls on this Safe-owned chain. Execute only after migration verification passes.',
		finalBatches,
	)
}

main().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
