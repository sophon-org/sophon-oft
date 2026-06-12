import 'dotenv/config'

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

interface SafeBuilderTx {
	to: string
	value: string
	data: string
	nonce?: number
}

interface SafeBuilderFile {
	chainId: string
	meta: {
		name: string
		description: string
		createdFromSafeAddress: string
	}
	transactions: SafeBuilderTx[]
}

interface NetworkConfig {
	chainId: number
	network: NetworkName
	rpcUrl: string
	txServiceUrl: string
	safeAddress: string
}

interface SingletonDeployment {
	defaultAddress: string
	abi: unknown[]
}

interface ContractNetworkConfig {
	safeMasterCopyAddress: string
	safeMasterCopyAbi: unknown[]
	safeProxyFactoryAddress: string
	safeProxyFactoryAbi: unknown[]
	multiSendAddress: string
	multiSendAbi: unknown[]
	multiSendCallOnlyAddress: string
	multiSendCallOnlyAbi: unknown[]
	fallbackHandlerAddress: string
	fallbackHandlerAbi: unknown[]
	signMessageLibAddress: string
	signMessageLibAbi: unknown[]
	createCallAddress: string
	createCallAbi: unknown[]
	simulateTxAccessorAddress: string
	simulateTxAccessorAbi: unknown[]
}

interface SafeTransaction {
	data: unknown
}

interface SafeSignature {
	data: string
}

interface SafeSdk {
	createTransaction(input: {
		safeTransactionData: SafeBuilderTx | SafeBuilderTx[]
		onlyCalls: boolean
		options: { nonce: number }
	}): Promise<SafeTransaction>
	getTransactionHash(safeTransaction: SafeTransaction): Promise<string>
	signTransactionHash(hash: string): Promise<SafeSignature>
}

interface SafeService {
	getNextNonce(safeAddress: string): Promise<number>
	getTransaction(safeTxHash: string): Promise<unknown>
	proposeTransaction(input: ProposeTransactionInput): Promise<void>
}

interface ProposeTransactionInput {
	safeAddress: string
	safeTransactionData: unknown
	safeTxHash: string
	senderAddress: string
	senderSignature: string
	origin: string
}

interface ProposalResult {
	file: string
	network: NetworkName
	safeAddress: string
	nonce: number
	safeTxHash: string
	innerCalls: number
	status: 'dry-run' | 'proposed' | 'already-proposed' | 'already-present'
	txServiceUrl: string
	origin: string
}

interface ProposalError {
	network: NetworkName
	files: string[]
	error: string
}

interface PendingSafeTx {
	origin?: string | null
	nonce: number
}

const SAFE_BUILDER_DIR = path.join(
	'safe',
	'ethereum-migration',
	'prepared-calldata',
	'safe-transaction-builder',
)

const API_KIT_PATH = path.resolve(
	'node_modules/.pnpm/@safe-global+api-kit@1.3.1/node_modules/@safe-global/api-kit',
)
const PROTOCOL_KIT_PATH = path.resolve(
	'node_modules/.pnpm/@safe-global+protocol-kit@1.3.0_bufferutil@4.0.9_ethers@5.8.0_bufferutil@4.0.9_utf-8-va_c98d904eb8c2f9a81cee71ec9c6aee15/node_modules/@safe-global/protocol-kit',
)
const SAFE_DEPLOYMENTS_PATH = path.resolve(
	'node_modules/.pnpm/@safe-global+safe-deployments@1.37.34/node_modules/@safe-global/safe-deployments',
)

const NETWORKS: Record<NetworkName, NetworkConfig> = {
	ethereum: {
		chainId: 1,
		network: 'ethereum',
		rpcUrl:
			process.env.RPC_URL_ETHEREUM ?? 'https://ethereum-rpc.publicnode.com',
		txServiceUrl: 'https://safe-transaction-mainnet.safe.global',
		safeAddress: '0x3b181838Ae9DB831C17237FAbD7c10801Dd49fcD',
	},
	bsc: {
		chainId: 56,
		network: 'bsc',
		rpcUrl: process.env.RPC_URL_BSC ?? 'https://bsc.drpc.org',
		txServiceUrl: 'https://safe-transaction-bsc.safe.global',
		safeAddress: '0x3b181838Ae9DB831C17237FAbD7c10801Dd49fcD',
	},
	base: {
		chainId: 8453,
		network: 'base',
		rpcUrl: process.env.RPC_URL_BASE ?? 'https://mainnet.base.org',
		txServiceUrl: 'https://safe-transaction-base.safe.global',
		safeAddress: '0x3b181838Ae9DB831C17237FAbD7c10801Dd49fcD',
	},
	polygon: {
		chainId: 137,
		network: 'polygon',
		rpcUrl: process.env.RPC_URL_POLYGON ?? 'https://polygon.drpc.org',
		txServiceUrl: 'https://safe-transaction-polygon.safe.global',
		safeAddress: '0x3b181838Ae9DB831C17237FAbD7c10801Dd49fcD',
	},
	arbitrum: {
		chainId: 42161,
		network: 'arbitrum',
		rpcUrl: process.env.RPC_URL_ARBITRUM ?? 'https://arb1.arbitrum.io/rpc',
		txServiceUrl: 'https://safe-transaction-arbitrum.safe.global',
		safeAddress: '0x3b181838Ae9DB831C17237FAbD7c10801Dd49fcD',
	},
	beam: {
		chainId: 4337,
		network: 'beam',
		rpcUrl: process.env.RPC_URL_BEAM ?? 'https://build.onbeam.com/rpc',
		txServiceUrl: 'https://app.safe.onbeam.com/txs',
		safeAddress: '0xa72D557fB4E4A1a662fCE7cf506Ff593E5c90D3b',
	},
	sophon: {
		chainId: 50104,
		network: 'sophon',
		rpcUrl: process.env.RPC_URL_SOPHON ?? 'https://rpc.sophon.xyz',
		txServiceUrl: 'https://transaction.safe.sophon.xyz',
		safeAddress: '0xa3b1f968b608642dD16d7Fd31bEc0B2c915908dB',
	},
}

const SOPHON_SAFE_141_CONTRACTS = {
	safeMasterCopyAddress: '0x610fcA2e0279Fa1F8C00c8c2F71dF522AD469380',
	safeProxyFactoryAddress: '0xc329D02fd8CB2fc13aa919005aF46320794a8629',
	multiSendAddress: '0x309D0B190FeCCa8e1D5D8309a16F7e3CB133E885',
	multiSendCallOnlyAddress: '0x0408EF011960d02349d50286D20531229BCef773',
	fallbackHandlerAddress: '0x9301E98DD367135f21bdF66f342A249c9D5F9069',
	signMessageLibAddress: '0xAca1ec0a1A575CDCCF1DC3d5d296202Eb6061888',
	createCallAddress: '0xAAA566Fe7978bB0fb0B5362B7ba23038f4428D8f',
	simulateTxAccessorAddress: '0xdd35026932273768A3e31F4efF7313B5B7A7199d',
} satisfies Partial<ContractNetworkConfig>

function readJson<T>(file: string): T {
	return JSON.parse(fs.readFileSync(file, 'utf8')) as T
}

function requireEnv(name: string): string {
	const value = process.env[name]
	if (value == null || value === '') {
		throw new Error(`Missing ${name}`)
	}
	return value
}

function getNetworkFromBuilderFile(
	file: string,
	builder: SafeBuilderFile,
): NetworkName {
	const network = Object.values(NETWORKS).find(
		(config) => config.chainId === Number(builder.chainId),
	)?.network

	if (network == null) {
		throw new Error(`${file}: unsupported chainId ${builder.chainId}`)
	}

	if (!file.includes(`-${network}-${builder.chainId}.json`)) {
		throw new Error(`${file}: filename does not match builder chain ID`)
	}

	return network
}

function getSafeBuilderFiles(): string[] {
	return fs
		.readdirSync(SAFE_BUILDER_DIR)
		.filter((file) => file.endsWith('.json'))
		.sort((a, b) => {
			const networkA = a.replace(/^0[12]-(start|final)-/, '')
			const networkB = b.replace(/^0[12]-(start|final)-/, '')
			if (networkA === networkB) return a.localeCompare(b)
			return networkA.localeCompare(networkB)
		})
}

function isNotFound(error: unknown): boolean {
	const message = error instanceof Error ? error.message.toLowerCase() : ''
	return (
		message.includes('not found') ||
		message.includes('no multisigtransaction matches')
	)
}

async function fetchPendingByOrigin(
	config: NetworkConfig,
): Promise<Map<string, PendingSafeTx>> {
	const response = await fetch(
		`${config.txServiceUrl}/api/v1/safes/${config.safeAddress}/multisig-transactions/?executed=false&limit=100`,
	)
	const body = await response.text()
	if (!response.ok) {
		throw new Error(
			`${config.network}: failed to fetch pending txs: ${response.status} ${response.statusText}: ${body}`,
		)
	}

	const json = JSON.parse(body) as { results?: PendingSafeTx[] }
	return new Map(
		(json.results ?? [])
			.filter(
				(tx): tx is PendingSafeTx & { origin: string } => tx.origin != null,
			)
			.map((tx) => [tx.origin, tx]),
	)
}

function getDeployment(
	safeDeployments: Record<string, (filter?: unknown) => SingletonDeployment>,
	name: string,
	chainId: number,
): SingletonDeployment {
	const getter = safeDeployments[name]
	if (getter == null) {
		throw new Error(`Missing Safe deployments getter ${name}`)
	}

	return (
		getter({ network: String(chainId), version: '1.4.1' }) ??
		getter({ network: String(chainId) }) ??
		getter({ version: '1.4.1' }) ??
		getter()
	)
}

function getSafeContractNetworkConfig(
	chainId: number,
): Record<string, ContractNetworkConfig> {
	const safeDeployments = require(SAFE_DEPLOYMENTS_PATH) as Record<
		string,
		(filter?: unknown) => SingletonDeployment
	>
	const safeL2 = getDeployment(
		safeDeployments,
		chainId === 1
			? 'getSafeSingletonDeployment'
			: 'getSafeL2SingletonDeployment',
		chainId,
	)
	const proxyFactory = getDeployment(
		safeDeployments,
		'getProxyFactoryDeployment',
		chainId,
	)
	const multiSend = getDeployment(
		safeDeployments,
		'getMultiSendDeployment',
		chainId,
	)
	const multiSendCallOnly = getDeployment(
		safeDeployments,
		'getMultiSendCallOnlyDeployment',
		chainId,
	)
	const fallbackHandler = getDeployment(
		safeDeployments,
		'getCompatibilityFallbackHandlerDeployment',
		chainId,
	)
	const signMessageLib = getDeployment(
		safeDeployments,
		'getSignMessageLibDeployment',
		chainId,
	)
	const createCall = getDeployment(
		safeDeployments,
		'getCreateCallDeployment',
		chainId,
	)
	const simulateTxAccessor = getDeployment(
		safeDeployments,
		'getSimulateTxAccessorDeployment',
		chainId,
	)
	const sophonOverrides: Partial<ContractNetworkConfig> =
		chainId === NETWORKS.sophon.chainId ? SOPHON_SAFE_141_CONTRACTS : {}

	return {
		[String(chainId)]: {
			safeMasterCopyAddress:
				sophonOverrides.safeMasterCopyAddress ?? safeL2.defaultAddress,
			safeMasterCopyAbi: safeL2.abi,
			safeProxyFactoryAddress:
				sophonOverrides.safeProxyFactoryAddress ?? proxyFactory.defaultAddress,
			safeProxyFactoryAbi: proxyFactory.abi,
			multiSendAddress:
				sophonOverrides.multiSendAddress ?? multiSend.defaultAddress,
			multiSendAbi: multiSend.abi,
			multiSendCallOnlyAddress:
				sophonOverrides.multiSendCallOnlyAddress ??
				multiSendCallOnly.defaultAddress,
			multiSendCallOnlyAbi: multiSendCallOnly.abi,
			fallbackHandlerAddress:
				sophonOverrides.fallbackHandlerAddress ??
				fallbackHandler.defaultAddress,
			fallbackHandlerAbi: fallbackHandler.abi,
			signMessageLibAddress:
				sophonOverrides.signMessageLibAddress ?? signMessageLib.defaultAddress,
			signMessageLibAbi: signMessageLib.abi,
			createCallAddress:
				sophonOverrides.createCallAddress ?? createCall.defaultAddress,
			createCallAbi: createCall.abi,
			simulateTxAccessorAddress:
				sophonOverrides.simulateTxAccessorAddress ??
				simulateTxAccessor.defaultAddress,
			simulateTxAccessorAbi: simulateTxAccessor.abi,
		},
	}
}

async function alreadyProposed(
	service: SafeService,
	config: NetworkConfig,
	safeTxHash: string,
): Promise<boolean> {
	const safeApiKey = process.env.SAFE_API_KEY
	if (safeApiKey != null && safeApiKey !== '') {
		const response = await fetch(
			`${config.txServiceUrl}/api/v1/multisig-transactions/${safeTxHash}/`,
			{
				headers: {
					Accept: 'application/json',
					Authorization: `Bearer ${safeApiKey}`,
				},
			},
		)
		if (response.status === 404) return false
		if (response.ok) return true
		const body = await response.text()
		throw new Error(`${response.status} ${response.statusText}: ${body}`)
	}

	try {
		await service.getTransaction(safeTxHash)
		return true
	} catch (error) {
		if (isNotFound(error)) return false
		throw error
	}
}

async function authenticatedProposeTransaction(
	service: SafeService,
	config: NetworkConfig,
	input: ProposeTransactionInput,
): Promise<void> {
	const safeApiKey = process.env.SAFE_API_KEY
	if (safeApiKey == null || safeApiKey === '') {
		await service.proposeTransaction(input)
		return
	}

	const body = {
		...(input.safeTransactionData as Record<string, unknown>),
		contractTransactionHash: input.safeTxHash,
		sender: ethers.utils.getAddress(input.senderAddress),
		signature: input.senderSignature,
		origin: input.origin,
	}
	const response = await fetch(
		`${config.txServiceUrl}/api/v1/safes/${config.safeAddress}/multisig-transactions/`,
		{
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				Authorization: `Bearer ${safeApiKey}`,
			},
			body: JSON.stringify(body),
		},
	)
	const responseBody = await response.text()
	if (!response.ok) {
		throw new Error(
			`${response.status} ${response.statusText}: ${responseBody}`,
		)
	}
}

async function proposeNetworkFiles(
	network: NetworkName,
	files: string[],
	dryRun: boolean,
	unbatched: boolean,
	nonceOverride: number | undefined,
): Promise<ProposalResult[]> {
	const privateKey = requireEnv('PRIVATE_KEY')
	const config = NETWORKS[network]
	const provider = new ethers.providers.JsonRpcProvider(
		config.rpcUrl,
		config.chainId,
	)
	const signer = new ethers.Wallet(privateKey, provider)
	const senderAddress = await signer.getAddress()

	const SafeApiKit = require(API_KIT_PATH).default
	const { default: Safe, EthersAdapter } = require(PROTOCOL_KIT_PATH)
	const ethAdapter = new EthersAdapter({
		ethers,
		signerOrProvider: signer,
	})
	const service = new SafeApiKit({
		txServiceUrl: config.txServiceUrl,
		ethAdapter,
	}) as SafeService
	const safeSdk = (await Safe.create({
		ethAdapter,
		safeAddress: config.safeAddress,
		isL1SafeMasterCopy: config.chainId === 1,
		contractNetworks: getSafeContractNetworkConfig(config.chainId),
	})) as SafeSdk
	const pendingByOrigin = await fetchPendingByOrigin(config)

	let nonce: number
	if (nonceOverride != null) {
		nonce = nonceOverride
	} else {
		try {
			nonce = Number(await service.getNextNonce(config.safeAddress))
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			throw new Error(`${network}: failed to fetch next Safe nonce: ${message}`)
		}
	}
	if (!Number.isSafeInteger(nonce)) {
		throw new Error(`${network}: invalid next Safe nonce`)
	}
	const results: ProposalResult[] = []

	for (const file of files) {
		const builder = readJson<SafeBuilderFile>(path.join(SAFE_BUILDER_DIR, file))
		if (
			builder.meta.createdFromSafeAddress.toLowerCase() !==
			config.safeAddress.toLowerCase()
		) {
			throw new Error(`${file}: Safe address does not match ${network}`)
		}

		const origin = `SOPH Ethereum OFT migration: ${builder.meta.name}`
		const pendingTx = pendingByOrigin.get(origin)
		if (pendingTx != null) {
			results.push({
				file,
				network,
				safeAddress: config.safeAddress,
				nonce: pendingTx.nonce,
				safeTxHash: '',
				innerCalls: builder.transactions.length,
				status: 'already-present',
				txServiceUrl: config.txServiceUrl,
				origin,
			})
			nonce = Math.max(nonce, pendingTx.nonce + 1)
			continue
		}

		const transactionGroups = unbatched
			? builder.transactions.map((tx, index) => ({
					origin: `${origin} call ${index + 1}/${builder.transactions.length}`,
					transactions: [tx],
				}))
			: [
					{
						origin,
						transactions: builder.transactions,
					},
				]

		for (const group of transactionGroups) {
			const pendingGroupTx = pendingByOrigin.get(group.origin)
			if (pendingGroupTx != null) {
				results.push({
					file,
					network,
					safeAddress: config.safeAddress,
					nonce: pendingGroupTx.nonce,
					safeTxHash: '',
					innerCalls: group.transactions.length,
					status: 'already-present',
					txServiceUrl: config.txServiceUrl,
					origin: group.origin,
				})
				nonce = Math.max(nonce, pendingGroupTx.nonce + 1)
				continue
			}

			const safeTransaction = await safeSdk.createTransaction({
				safeTransactionData:
					group.transactions.length === 1
						? {
								to: group.transactions[0].to,
								value: group.transactions[0].value,
								data: group.transactions[0].data,
								nonce,
							}
						: group.transactions.map((tx) => ({
								to: tx.to,
								value: tx.value,
								data: tx.data,
							})),
				onlyCalls: true,
				options: { nonce },
			})
			const actualNonce = Number(
				(safeTransaction.data as { nonce: unknown }).nonce,
			)
			if (actualNonce !== nonce) {
				throw new Error(
					`${network}: SDK returned nonce ${actualNonce} for ${group.origin}, expected ${nonce}`,
				)
			}
			const safeTxHash = await safeSdk.getTransactionHash(safeTransaction)
			let status: ProposalResult['status'] = 'dry-run'

			if (!dryRun) {
				if (await alreadyProposed(service, config, safeTxHash)) {
					status = 'already-proposed'
				} else {
					const senderSignature = await safeSdk.signTransactionHash(safeTxHash)
					await authenticatedProposeTransaction(service, config, {
						safeAddress: config.safeAddress,
						safeTransactionData: safeTransaction.data,
						safeTxHash,
						senderAddress,
						senderSignature: senderSignature.data,
						origin: group.origin,
					})
					status = 'proposed'
					pendingByOrigin.set(group.origin, {
						origin: group.origin,
						nonce,
					})
				}
			}

			results.push({
				file,
				network,
				safeAddress: config.safeAddress,
				nonce,
				safeTxHash,
				innerCalls: group.transactions.length,
				status,
				txServiceUrl: config.txServiceUrl,
				origin: group.origin,
			})
			nonce += 1
		}
	}

	return results
}

async function main() {
	const dryRun = process.argv.includes('--dry-run')
	const unbatched = process.argv.includes('--unbatched')
	const networkArg = process.argv.find((arg) => arg.startsWith('--network='))
	const nonceArg = process.argv.find((arg) => arg.startsWith('--nonce='))
	const nonceOverride =
		nonceArg == null ? undefined : Number(nonceArg.split('=')[1])
	if (nonceOverride != null && !Number.isSafeInteger(nonceOverride)) {
		throw new Error(`Invalid nonce override ${nonceArg}`)
	}
	const selectedNetwork = networkArg?.split('=')[1] as NetworkName | undefined
	if (selectedNetwork != null && !(selectedNetwork in NETWORKS)) {
		throw new Error(`Unsupported network ${selectedNetwork}`)
	}
	const filesByNetwork = new Map<NetworkName, string[]>()

	for (const file of getSafeBuilderFiles()) {
		const builder = readJson<SafeBuilderFile>(path.join(SAFE_BUILDER_DIR, file))
		const network = getNetworkFromBuilderFile(file, builder)
		if (selectedNetwork != null && network !== selectedNetwork) continue
		filesByNetwork.set(network, [...(filesByNetwork.get(network) ?? []), file])
	}

	const results: ProposalResult[] = []
	const errors: ProposalError[] = []
	for (const network of [...filesByNetwork.keys()].sort()) {
		const files = filesByNetwork.get(network) ?? []
		try {
			results.push(
				...(await proposeNetworkFiles(
					network,
					files,
					dryRun,
					unbatched,
					nonceOverride,
				)),
			)
		} catch (error) {
			errors.push({
				network,
				files,
				error: error instanceof Error ? error.message : String(error),
			})
		}
	}

	console.log(JSON.stringify({ results, errors }, null, 2))
	if (errors.length > 0) {
		process.exitCode = 1
	}
}

main().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
