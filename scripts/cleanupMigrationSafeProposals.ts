import 'dotenv/config'

import { ethers } from 'ethers'

interface NetworkConfig {
	name: string
	chainId: number
	txServiceUrl: string
	safeAddress: string
}

interface SafeTx {
	nonce: number
	safeTxHash: string
	origin: string | null
	proposer: string | null
	proposedByDelegate: string | null
	confirmations?: unknown[]
	to: string
	operation: number
	data?: string | null
	submissionDate: string
}

interface NetworkSummary {
	network: string
	kept: SafeTx[]
	deleted: { nonce: number; safeTxHash: string; origin: string | null }[]
	skipped: { nonce: number; safeTxHash: string; reason: string }[]
	error?: string
}

const NETWORKS: NetworkConfig[] = [
	{
		name: 'ethereum',
		chainId: 1,
		txServiceUrl: 'https://safe-transaction-mainnet.safe.global',
		safeAddress: '0x3b181838Ae9DB831C17237FAbD7c10801Dd49fcD',
	},
	{
		name: 'arbitrum',
		chainId: 42161,
		txServiceUrl: 'https://safe-transaction-arbitrum.safe.global',
		safeAddress: '0x3b181838Ae9DB831C17237FAbD7c10801Dd49fcD',
	},
	{
		name: 'base',
		chainId: 8453,
		txServiceUrl: 'https://safe-transaction-base.safe.global',
		safeAddress: '0x3b181838Ae9DB831C17237FAbD7c10801Dd49fcD',
	},
	{
		name: 'bsc',
		chainId: 56,
		txServiceUrl: 'https://safe-transaction-bsc.safe.global',
		safeAddress: '0x3b181838Ae9DB831C17237FAbD7c10801Dd49fcD',
	},
	{
		name: 'polygon',
		chainId: 137,
		txServiceUrl: 'https://safe-transaction-polygon.safe.global',
		safeAddress: '0x3b181838Ae9DB831C17237FAbD7c10801Dd49fcD',
	},
	{
		name: 'beam',
		chainId: 4337,
		txServiceUrl: 'https://app.safe.onbeam.com/txs',
		safeAddress: '0xa72D557fB4E4A1a662fCE7cf506Ff593E5c90D3b',
	},
	{
		name: 'sophon',
		chainId: 50104,
		txServiceUrl: 'https://transaction.safe.sophon.xyz',
		safeAddress: '0xa3b1f968b608642dD16d7Fd31bEc0B2c915908dB',
	},
]

const DELETE_TYPES = {
	DeleteRequest: [
		{ name: 'safeTxHash', type: 'bytes32' },
		{ name: 'totp', type: 'uint256' },
	],
}

function requireEnv(name: string): string {
	const value = process.env[name]
	if (value == null || value === '') {
		throw new Error(`Missing ${name}`)
	}
	return value
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
	const response = await fetch(url, init)
	const body = await response.text()
	if (!response.ok) {
		throw new Error(`${response.status} ${response.statusText}: ${body}`)
	}
	return JSON.parse(body) as T
}

function isMigrationTx(tx: SafeTx): boolean {
	return tx.origin?.includes('SOPH Ethereum OFT migration') === true
}

function groupByOrigin(txs: SafeTx[]): Map<string, SafeTx[]> {
	const groups = new Map<string, SafeTx[]>()
	for (const tx of txs) {
		const origin = tx.origin ?? ''
		groups.set(origin, [...(groups.get(origin) ?? []), tx])
	}
	return groups
}

async function signDelete(
	wallet: ethers.Wallet,
	network: NetworkConfig,
	safeTxHash: string,
): Promise<string> {
	const totp = Math.floor(Date.now() / 1000 / 3600)
	return wallet._signTypedData(
		{
			name: 'Safe Transaction Service',
			version: '1.0',
			chainId: network.chainId,
			verifyingContract: network.safeAddress,
		},
		DELETE_TYPES,
		{ safeTxHash, totp },
	)
}

async function deleteTx(
	network: NetworkConfig,
	wallet: ethers.Wallet,
	tx: SafeTx,
) {
	const signature = await signDelete(wallet, network, tx.safeTxHash)
	const response = await fetch(
		`${network.txServiceUrl}/api/v1/multisig-transactions/${tx.safeTxHash}/`,
		{
			method: 'DELETE',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ signature }),
		},
	)
	const body = await response.text()
	if (response.status !== 204) {
		throw new Error(`${response.status} ${response.statusText}: ${body}`)
	}
}

async function processNetwork(
	network: NetworkConfig,
	wallet: ethers.Wallet,
	deleteDuplicates: boolean,
): Promise<NetworkSummary> {
	const summary: NetworkSummary = {
		network: network.name,
		kept: [],
		deleted: [],
		skipped: [],
	}

	const response = await fetchJson<{ results: SafeTx[] }>(
		`${network.txServiceUrl}/api/v1/safes/${network.safeAddress}/multisig-transactions/?executed=false&limit=100`,
	)
	const migrationTxs = response.results
		.filter(isMigrationTx)
		.sort((a, b) => a.nonce - b.nonce)

	for (const txs of groupByOrigin(migrationTxs).values()) {
		const sorted = txs.sort((a, b) => a.nonce - b.nonce)
		const [keeper, ...duplicates] = sorted
		if (keeper != null) summary.kept.push(keeper)

		for (const duplicate of duplicates) {
			const proposer = duplicate.proposer?.toLowerCase()
			const proposedByDelegate = duplicate.proposedByDelegate?.toLowerCase()
			const signer = wallet.address.toLowerCase()
			if (proposer !== signer && proposedByDelegate !== signer) {
				summary.skipped.push({
					nonce: duplicate.nonce,
					safeTxHash: duplicate.safeTxHash,
					reason: `not proposed by ${wallet.address}`,
				})
				continue
			}

			if (deleteDuplicates) {
				await deleteTx(network, wallet, duplicate)
				summary.deleted.push({
					nonce: duplicate.nonce,
					safeTxHash: duplicate.safeTxHash,
					origin: duplicate.origin,
				})
			} else {
				summary.skipped.push({
					nonce: duplicate.nonce,
					safeTxHash: duplicate.safeTxHash,
					reason: 'duplicate, dry-run only',
				})
			}
		}
	}

	summary.kept.sort((a, b) => a.nonce - b.nonce)
	return summary
}

async function main() {
	const deleteDuplicates = process.argv.includes('--delete-duplicates')
	const wallet = new ethers.Wallet(requireEnv('PRIVATE_KEY'))
	const summaries: NetworkSummary[] = []

	for (const network of NETWORKS) {
		try {
			summaries.push(await processNetwork(network, wallet, deleteDuplicates))
		} catch (error) {
			summaries.push({
				network: network.name,
				kept: [],
				deleted: [],
				skipped: [],
				error: error instanceof Error ? error.message : String(error),
			})
		}
	}

	console.log(
		JSON.stringify(
			summaries.map((summary) => ({
				network: summary.network,
				kept: summary.kept.map((tx) => ({
					nonce: tx.nonce,
					safeTxHash: tx.safeTxHash,
					origin: tx.origin,
					proposer: tx.proposer,
					confirmations: tx.confirmations?.length ?? 0,
				})),
				deleted: summary.deleted,
				skipped: summary.skipped,
				error: summary.error,
			})),
			null,
			2,
		),
	)
}

main().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
