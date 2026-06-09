#!/bin/bash

# Script to transfer ownership for Safe-owned networks.
# Optional: set NEW_OWNER to override each network's safeConfig.safeAddress.
# Optional: set INCLUDE_ETHEREUM=1 only after the Ethereum migration is complete.

echo "Starting ownership transfer for selected networks..."
echo "Default new owner is each network's safeConfig.safeAddress."
echo "Ethereum is skipped by default during the migration."
echo ""

# Array of networks
networks=("sophon" "bsc" "base" "polygon" "arbitrum" "beam")

if [[ "${INCLUDE_ETHEREUM:-0}" == "1" ]]; then
    networks=("ethereum" "${networks[@]}")
fi

# Track results
declare -A results

# Run for each network
for network in "${networks[@]}"; do
    echo "========================================"
    echo "Processing $network..."
    echo "========================================"
    
    if npx hardhat run scripts/transferOwnership.ts --network "$network"; then
        results[$network]="SUCCESS"
        echo "$network completed successfully"
    else
        results[$network]="FAILED"
        echo "$network failed"
    fi
    
    echo ""
    sleep 2  # Small delay between networks
done

# Summary
echo "========================================"
echo "SUMMARY"
echo "========================================"
for network in "${networks[@]}"; do
    echo "$network: ${results[$network]}"
done

# Check if all succeeded
all_success=true
for network in "${networks[@]}"; do
    if [[ "${results[$network]}" == "FAILED" ]]; then
        all_success=false
        break
    fi
done

if $all_success; then
    echo ""
    echo "All ownership transfers completed successfully!"
    exit 0
else
    echo ""
    echo "Some transfers failed. Please check the logs above."
    exit 1
fi
