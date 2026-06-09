import hre from 'hardhat'
import '@nomiclabs/hardhat-ethers'

// Contract addresses from deployments
const CONTRACT_ADDRESSES = {
	ethereum: '0xb09F17b1c52DCC6870070047e1D84e3Aab1c4DD1', // SophonTokenOFTAdapter
	sophon: '0x70ff61C1436d19090321A312b1f4be89D62ac55C', // legacy SophonTokenOFTAdapter
	bsc: '0x31DbA3c96481FDe3CD81C2aaF51F2D8bf618C742', // SophonTokenOFT
	base: '0x31DbA3c96481FDe3CD81C2aaF51F2D8bf618C742', // SophonTokenOFT
	polygon: '0xEb971Fd26783f32694dbB392dD7289de23109148', // SophonTokenOFT
	arbitrum: '0x31DbA3c96481FDe3CD81C2aaF51F2D8bf618C742', // SophonTokenOFT
	beam: '0x31DbA3c96481FDe3CD81C2aaF51F2D8bf618C742', // SophonTokenOFT
} as const

// Basic ABI for the functions we need
const CONTRACT_ABI = [
	'function setDelegate(address _delegate) external',
	'function transferOwnership(address newOwner) external',
	'function owner() external view returns (address)',
]

async function main() {
	console.log('Starting ownership transfer script...')
	console.log(`Network: ${hre.network.name}`)

	const networkName = hre.network.name as keyof typeof CONTRACT_ADDRESSES

	if (!(networkName in CONTRACT_ADDRESSES)) {
		console.error(
			`Network ${hre.network.name} is not supported. Supported networks: ${Object.keys(CONTRACT_ADDRESSES).join(', ')}`,
		)
		process.exit(1)
	}

	const newOwner =
		process.env.NEW_OWNER || hre.network.config.safeConfig?.safeAddress

	if (newOwner == null) {
		console.error(
			'Missing NEW_OWNER and no safeConfig.safeAddress is configured for this network.',
		)
		process.exit(1)
	}

	if (!hre.ethers.utils.isAddress(newOwner)) {
		console.error('NEW_OWNER is not a valid Ethereum address.')
		process.exit(1)
	}

	console.log(`New owner/delegate will be: ${newOwner}`)

	try {
		const [signer] = await hre.ethers.getSigners()
		console.log(`Using signer: ${signer.address}`)

		const contractAddress = CONTRACT_ADDRESSES[networkName]
		console.log(`Contract address: ${contractAddress}`)

		const contract = new hre.ethers.Contract(
			contractAddress,
			CONTRACT_ABI,
			signer,
		)

		const currentOwner = await contract.owner()
		console.log(`Current owner: ${currentOwner}`)

		if (currentOwner.toLowerCase() !== signer.address.toLowerCase()) {
			console.log('Signer is not the current owner. Cannot proceed.')
			console.log(`  Current owner: ${currentOwner}`)
			console.log(`  Signer: ${signer.address}`)
			process.exit(1)
		}

		console.log(`Setting delegate to ${newOwner}...`)
		const setDelegateTx = await contract.setDelegate(newOwner)
		console.log(`Transaction sent: ${setDelegateTx.hash}`)
		await setDelegateTx.wait()
		console.log('Delegate set successfully')

		if (currentOwner.toLowerCase() === newOwner.toLowerCase()) {
			console.log(`Already owned by ${newOwner}`)
			return
		}

		console.log(`Transferring ownership to ${newOwner}...`)
		const transferTx = await contract.transferOwnership(newOwner)
		console.log(`Transaction sent: ${transferTx.hash}`)
		await transferTx.wait()
		console.log('Ownership transfer transaction confirmed')

		const verifiedOwner = await contract.owner()
		console.log(`Verified owner: ${verifiedOwner}`)

		if (verifiedOwner.toLowerCase() !== newOwner.toLowerCase()) {
			console.error('Ownership transfer verification failed')
			process.exit(1)
		}

		console.log(`Ownership transfer completed successfully on ${networkName}`)
	} catch (error) {
		console.error(`Error processing ${networkName}:`, error)
		process.exit(1)
	}
}

// Handle errors
main().catch((error) => {
	console.error('Script failed:', error)
	process.exit(1)
})
