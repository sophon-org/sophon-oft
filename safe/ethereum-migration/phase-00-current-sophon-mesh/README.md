# Phase 00: Current Sophon Mesh Preflight

Purpose: capture the current production LayerZero peer/config state before any
migration transaction is submitted.

Config:

```bash
layerzero.config.migration.00-current-sophon-mesh.ts
```

Commands:

```bash
npx hardhat lz:oapp:peers:get --oapp-config layerzero.config.migration.00-current-sophon-mesh.ts
npx hardhat lz:oapp:config:get --oapp-config layerzero.config.migration.00-current-sophon-mesh.ts
MESH_MODE=current ./scripts/lzcheck.sh
```

Expected Safe transactions: none.

Verification gate:

- Current Sophon mesh peers match the pre-migration address table.
- Send/receive libraries, DVNs, executor config, and enforced options are
  explicitly understood before migration starts.
- DVN audit is clean or any known mismatch is explicitly accepted before
  proceeding.
