# Phase 04: Final Ethereum Mesh

Purpose: configure the final production mesh with Ethereum as the only
OFTAdapter hub and BSC, Base, Polygon, Arbitrum, and Beam as OFTs.

Prepare and execute the Ethereum EOA-owned side without `--safe`:

```bash
npx hardhat lz:oapp:wire --oapp-config layerzero.config.migration.04-final-ethereum-eoa.ts
```

Prepare and submit the Safe-owned satellite sides:

```bash
npx hardhat lz:oapp:wire --oapp-config layerzero.config.migration.04-final-satellite-safes.ts --safe
```

Expected networks: Ethereum through the EOA; BSC, Base, Polygon, Arbitrum, and
Beam through their configured Safes.

Verification gate:

```bash
npx hardhat lz:oapp:peers:get --oapp-config layerzero.config.ts
npx hardhat lz:oapp:config:get --oapp-config layerzero.config.ts
./scripts/lzcheck.sh
```

The legacy Sophon NativeOFTAdapter must remain excluded from the final graph.

After this phase verifies, transfer the Ethereum adapter owner/delegate to the
Ethereum Safe:

```bash
npx hardhat run scripts/transferOwnership.ts --network ethereum
```
