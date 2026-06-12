import 'dotenv/config'

import { ethers } from 'ethers'

interface SafeTx {
	safeTxHash: string
	origin: string | null
}

const SAFE_ADDRESS = '0xa3b1f968b608642dD16d7Fd31bEc0B2c915908dB'
const CHAIN_ID = 50104
const TX_SERVICE_URL = 'https://transaction.safe.sophon.xyz'

function requireEnv(name: string): string {
	const value = process.env[name]
	if (value == null || value === '') throw new Error(`Missing ${name}`)
	return value
}

async function main() {
	const wallet = new ethers.Wallet(requireEnv('PRIVATE_KEY'))
	const response = await fetch(
		`${TX_SERVICE_URL}/api/v1/safes/${SAFE_ADDRESS}/multisig-transactions/?executed=false&limit=100`,
	)
	const body = await response.text()
	if (!response.ok) {
		throw new Error(`${response.status} ${response.statusText}: ${body}`)
	}

	const json = JSON.parse(body) as { results: SafeTx[] }
	const txs = json.results.filter(
		(tx) =>
			tx.origin?.includes('SOPH Ethereum OFT migration: SOPH migration') ===
				true && tx.origin.includes(' call '),
	)
	const domain = {
		name: 'Safe Transaction Service',
		version: '1.0',
		chainId: CHAIN_ID,
		verifyingContract: SAFE_ADDRESS,
	}
	const types = {
		DeleteRequest: [
			{ name: 'safeTxHash', type: 'bytes32' },
			{ name: 'totp', type: 'uint256' },
		],
	}
	const totp = Math.floor(Date.now() / 1000 / 3600)
	const deleted = []

	for (const tx of txs) {
		const signature = await wallet._signTypedData(domain, types, {
			safeTxHash: tx.safeTxHash,
			totp,
		})
		const deleteResponse = await fetch(
			`${TX_SERVICE_URL}/api/v1/multisig-transactions/${tx.safeTxHash}/`,
			{
				method: 'DELETE',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ signature }),
			},
		)
		const deleteBody = await deleteResponse.text()
		if (deleteResponse.status !== 204) {
			throw new Error(`${tx.safeTxHash} ${deleteResponse.status} ${deleteBody}`)
		}
		deleted.push(tx)
	}

	console.log(JSON.stringify({ deleted }, null, 2))
}

main().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
