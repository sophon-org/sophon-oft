# Ownership Transfer Script

This script transfers ownership and sets delegates for SophonToken OFT contracts across multiple chains.

## Prerequisites

1. Make sure you have the private key or mnemonic of the current owner in your `.env` file
2. Configure each network's `safeConfig.safeAddress` in `hardhat.config.ts`, or set `NEW_OWNER` to override the target owner/delegate

## Usage

For the Ethereum migration, do **not** transfer the Ethereum adapter to the Safe
until the final Ethereum mesh has been configured and verified. The Ethereum
adapter should remain EOA-owned during migration execution.

1. **Optionally set a new owner address:**

   ```bash
   export NEW_OWNER=0xYourNewOwnerAddressHere
   ```

   If `NEW_OWNER` is unset, the script uses the active network's `safeConfig.safeAddress`.

2. **Run the script:**

   **Option A: Run for Safe-owned networks at once**
   ```bash
   ./scripts/transferOwnershipAll.sh
   ```

   Ethereum is skipped by default so the migration adapter stays EOA-owned
   until the final mesh is configured and verified. After final migration
   verification, include Ethereum explicitly:

   ```bash
   INCLUDE_ETHEREUM=1 ./scripts/transferOwnershipAll.sh
   ```

   **Option B: Run for individual networks**
   ```bash
   # For Sophon
   npx hardhat run scripts/transferOwnership.ts --network sophon

   # For Ethereum
   # Run only after final migration verification.
   npx hardhat run scripts/transferOwnership.ts --network ethereum
   
   # For BSC
   npx hardhat run scripts/transferOwnership.ts --network bsc
   
   # For Base
   npx hardhat run scripts/transferOwnership.ts --network base
   
   # For Polygon
   npx hardhat run scripts/transferOwnership.ts --network polygon
   
   # For Arbitrum
   npx hardhat run scripts/transferOwnership.ts --network arbitrum

   # For Beam
   npx hardhat run scripts/transferOwnership.ts --network beam
   ```

## What the script does

For each supported chain:

1. **Sets the delegate** to the new owner address using `setDelegate(newOwner)`
2. **Transfers ownership** to the new owner using `transferOwnership(newOwner)`, if not already owned by that address

## Contract Addresses

- **Ethereum**: `0xb09F17b1c52DCC6870070047e1D84e3Aab1c4DD1` (SophonTokenOFTAdapter)
- **Sophon**: `0x70ff61C1436d19090321A312b1f4be89D62ac55C` (SophonTokenOFTAdapter)
- **BSC**: `0x31DbA3c96481FDe3CD81C2aaF51F2D8bf618C742` (SophonTokenOFT)
- **Base**: `0x31DbA3c96481FDe3CD81C2aaF51F2D8bf618C742` (SophonTokenOFT)
- **Polygon**: `0xEb971Fd26783f32694dbB392dD7289de23109148` (SophonTokenOFT)
- **Arbitrum**: `0x31DbA3c96481FDe3CD81C2aaF51F2D8bf618C742` (SophonTokenOFT)
- **Beam**: `0x31DbA3c96481FDe3CD81C2aaF51F2D8bf618C742` (SophonTokenOFT)

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
