#!/bin/bash

# Script to transfer ownership for all networks
# Make sure to update NEW_OWNER in transferOwnership.ts before running

echo "🚀 Starting ownership transfer for all networks..."
echo "Make sure NEW_OWNER is set correctly in transferOwnership.ts"
echo ""

# Array of networks
networks=("sophon" "bsc" "base" "polygon" "arbitrum")

# Track results
declare -A results

# Run for each network
for network in "${networks[@]}"; do
    echo "========================================"
    echo "Processing $network..."
    echo "========================================"
    
    if npx hardhat run scripts/transferOwnership.ts --network "$network"; then
        results[$network]="✅ SUCCESS"
        echo "✅ $network completed successfully"
    else
        results[$network]="❌ FAILED"
        echo "❌ $network failed"
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
    if [[ "${results[$network]}" == *"FAILED"* ]]; then
        all_success=false
        break
    fi
done

if $all_success; then
    echo ""
    echo "🎉 All ownership transfers completed successfully!"
    exit 0
else
    echo ""
    echo "⚠️  Some transfers failed. Please check the logs above."
    exit 1
fi 