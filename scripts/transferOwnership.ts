import hre from 'hardhat'
import '@nomiclabs/hardhat-ethers'

// Define the new owner address
const NEW_OWNER = '0x50B238788747B26c408681283D148659F9da7Cf9' 

// Contract addresses from deployments
const CONTRACT_ADDRESSES = {
    sophon: '0x70ff61C1436d19090321A312b1f4be89D62ac55C', // SophonTokenOFTAdapter
    bsc: '0x31DbA3c96481FDe3CD81C2aaF51F2D8bf618C742', // SophonTokenOFT
    base: '0x31DbA3c96481FDe3CD81C2aaF51F2D8bf618C742', // SophonTokenOFT
    polygon: '0xEb971Fd26783f32694dbB392dD7289de23109148', // SophonTokenOFT
    arbitrum: '0x31DbA3c96481FDe3CD81C2aaF51F2D8bf618C742', // SophonTokenOFT
}

// Basic ABI for the functions we need
const CONTRACT_ABI = [
    'function setDelegate(address _delegate) external',
    'function transferOwnership(address newOwner) external',
    'function owner() external view returns (address)',
    'function delegates(address) external view returns (address)'
]

async function main() {
    console.log('🚀 Starting ownership transfer script...')
    console.log(`Network: ${hre.network.name}`)
    console.log(`New owner will be: ${NEW_OWNER}`)
    
    // Get the current network name
    const networkName = hre.network.name
    
    // Check if the network is supported
    if (!(networkName in CONTRACT_ADDRESSES)) {
        console.error(`❌ Network ${networkName} is not supported. Supported networks: ${Object.keys(CONTRACT_ADDRESSES).join(', ')}`)
        process.exit(1)
    }
    
    // Validate NEW_OWNER address
    if (!hre.ethers.utils.isAddress(NEW_OWNER)) {
        console.error('❌ NEW_OWNER is not a valid Ethereum address!')
        process.exit(1)
    }
    
    try {
        const [signer] = await hre.ethers.getSigners()
        console.log(`Using signer: ${signer.address}`)
        
        const contractAddress = CONTRACT_ADDRESSES[networkName as keyof typeof CONTRACT_ADDRESSES]
        console.log(`Contract address: ${contractAddress}`)
        
        // Create contract instance
        const contract = new hre.ethers.Contract(contractAddress, CONTRACT_ABI, signer)
        
        // Check current owner
        const currentOwner = await contract.owner()
        console.log(`Current owner: ${currentOwner}`)
        
        if (currentOwner.toLowerCase() !== signer.address.toLowerCase()) {
            console.log(`❌ Signer is not the current owner. Cannot proceed.`)
            console.log(`  Current owner: ${currentOwner}`)
            console.log(`  Your address: ${signer.address}`)
            process.exit(1)
        }
        
        if (currentOwner.toLowerCase() === NEW_OWNER.toLowerCase()) {
            console.log(`✅ Already owned by ${NEW_OWNER}`)
            return
        }
        
        // Step 1: Set delegate to NEW_OWNER
        console.log(`Setting delegate to ${NEW_OWNER}...`)
        const setDelegateTx = await contract.setDelegate(NEW_OWNER)
        console.log(`Transaction sent: ${setDelegateTx.hash}`)
        await setDelegateTx.wait()
        console.log(`✅ Delegate set successfully`)
        
        // Step 2: Transfer ownership to NEW_OWNER
        console.log(`Transferring ownership to ${NEW_OWNER}...`)
        const transferTx = await contract.transferOwnership(NEW_OWNER)
        console.log(`Transaction sent: ${transferTx.hash}`)
        await transferTx.wait()
        console.log(`✅ Ownership transferred successfully`)
        
        // Verify the changes
        const newOwner = await contract.owner()
        console.log(`New owner: ${newOwner}`)
        
        if (newOwner.toLowerCase() === NEW_OWNER.toLowerCase()) {
            console.log(`🎉 Ownership transfer completed successfully on ${networkName}!`)
        } else {
            console.log(`❌ Ownership transfer verification failed`)
        }
        
    } catch (error) {
        console.error(`❌ Error processing ${networkName}:`, error)
        process.exit(1)
    }
}

// Handle errors
main().catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
}) 