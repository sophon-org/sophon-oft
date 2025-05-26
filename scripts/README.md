# Ownership Transfer Script

This script transfers ownership and sets delegates for SophonToken OFT contracts across multiple chains.

## Prerequisites

1. Make sure you have the private key or mnemonic of the current owner in your `.env` file
2. Update the `NEW_OWNER` constant in `transferOwnership.ts` with the desired new owner address

## Usage

1. **Update the new owner address:**
   ```typescript
   // In scripts/transferOwnership.ts
   const NEW_OWNER = '0xYourNewOwnerAddressHere'
   ```

2. **Run the script:**

   **Option A: Run for all networks at once**
   ```bash
   ./scripts/transferOwnershipAll.sh
   ```

   **Option B: Run for individual networks**
   ```bash
   # For Sophon
   npx hardhat run scripts/transferOwnership.ts --network sophon
   
   # For BSC
   npx hardhat run scripts/transferOwnership.ts --network bsc
   
   # For Base
   npx hardhat run scripts/transferOwnership.ts --network base
   
   # For Polygon
   npx hardhat run scripts/transferOwnership.ts --network polygon
   
   # For Arbitrum
   npx hardhat run scripts/transferOwnership.ts --network arbitrum
   ```

## What the script does

For each chain (Sophon, BSC, Base, Polygon, Arbitrum):

1. **Sets the delegate** to the new owner address using `setDelegate(NEW_OWNER)`
2. **Transfers ownership** to the new owner using `transferOwnership(NEW_OWNER)`

## Contract Addresses

- **Sophon**: `0x70ff61C1436d19090321A312b1f4be89D62ac55C` (SophonTokenOFTAdapter)
- **BSC**: `0x31DbA3c96481FDe3CD81C2aaF51F2D8bf618C742` (SophonTokenOFT)
- **Base**: `0x31DbA3c96481FDe3CD81C2aaF51F2D8bf618C742` (SophonTokenOFT)
- **Polygon**: `0xEb971Fd26783f32694dbB392dD7289de23109148` (SophonTokenOFT)
- **Arbitrum**: `0x31DbA3c96481FDe3CD81C2aaF51F2D8bf618C742` (SophonTokenOFT)

## Safety Features

- The script validates that the new owner address is a valid Ethereum address
- It checks that the current signer is the owner before attempting transfers
- It provides detailed logging for each step
- It shows a summary at the end with success/failure status for each chain

## Important Notes

- **This is irreversible!** Make sure you have control of the new owner address
- The script will fail if you're not the current owner of the contracts
- Each transaction requires gas fees on the respective networks
- The script includes a 2-second delay between networks to avoid rate limiting 