# SOPH Ethereum OFTAdapter Migration

This runbook migrates the SOPH LayerZero mesh from the legacy Sophon
`NativeOFTAdapter` to the Ethereum `OFTAdapter` deployed at:

```text
0xb09F17b1c52DCC6870070047e1D84e3Aab1c4DD1
```

There is one prepared transaction set in the repository:

```text
safe/ethereum-migration/prepared-calldata/
```

Do not use older phase-based artifacts. They have been removed.

## Addresses

| Role | Chain | EID | Address |
| --- | --- | ---: | --- |
| New ERC20 OFTAdapter | Ethereum | 30101 | `0xb09F17b1c52DCC6870070047e1D84e3Aab1c4DD1` |
| Canonical SOPH ERC20 | Ethereum | - | `0x6b7774cb12ed7573a7586e7d0e62a2a563ddd3f0` |
| Legacy NativeOFTAdapter | Sophon | 30334 | `0x70ff61C1436d19090321A312b1f4be89D62ac55C` |
| SOPH OFT | BSC | 30102 | `0x31DbA3c96481FDe3CD81C2aaF51F2D8bf618C742` |
| SOPH OFT | Base | 30184 | `0x31DbA3c96481FDe3CD81C2aaF51F2D8bf618C742` |
| SOPH OFT | Polygon | 30109 | `0xEb971Fd26783f32694dbB392dD7289de23109148` |
| SOPH OFT | Arbitrum | 30110 | `0x31DbA3c96481FDe3CD81C2aaF51F2D8bf618C742` |
| SOPH OFT | Beam | 30198 | `0x31DbA3c96481FDe3CD81C2aaF51F2D8bf618C742` |

## Ownership

The Ethereum adapter remains owned by this EOA until the migration is complete
and verified:

```text
0x50B238788747B26c408681283D148659F9da7Cf9
```

Ethereum adapter batch 1 transactions are not Safe transactions.
Use:

```text
safe/ethereum-migration/prepared-calldata/03-ethereum-eoa-calldata.json
```

Use `batch1StartMigration.transactions` when the migration starts. After batch 1
execution and verification, use `ownershipTransferToSafe.transactions` to set
the Ethereum adapter delegate and owner to the Ethereum Safe:

```text
0x3b181838Ae9DB831C17237FAbD7c10801Dd49fcD
```

Batch 2 Ethereum transactions are Safe transactions submitted to that Ethereum
Safe.

## Transaction Set

Regenerate the single prepared transaction set with:

```bash
pnpm exec ts-node scripts/generateMigrationCalldata.ts
```

The generator clears stale files under
`safe/ethereum-migration/prepared-calldata/` before writing the current set.

Files:

- `01-start-migration-batch.json`: batch 1 grouped by chain.
- `02-final-reconnect-batch.json`: batch 2 grouped by chain.
- `03-ethereum-eoa-calldata.json`: Ethereum EOA calldata for batch 1 and the
  ownership/delegate handoff to the Ethereum Safe.
- `safe-transaction-builder/01-start-*.json`: Safe Transaction Builder imports
  for batch 1.
- `safe-transaction-builder/02-final-*.json`: Safe Transaction Builder imports
  for batch 2.

Verify the generated Safe transaction set with
[`scripts/verifyMigrationSafeTxs.ts`](../scripts/verifyMigrationSafeTxs.ts):

```bash
pnpm exec ts-node scripts/verifyMigrationSafeTxs.ts
```

The verifier checks that every Safe Transaction Builder file matches the
aggregate calldata JSON, that the EOA calldata counts match, and that no
satellite <-> satellite peer writes are present.

## Safe Transaction Rundown

There are 13 Safe transactions to sign and execute: one Safe transaction per
Safe-owned chain in batch 1, and one Safe transaction per Safe-owned final
chain in batch 2.

Batch 1 has 6 Safe transactions with 15 inner calls:

- Arbitrum, Base, Beam, BSC, and Polygon: 1 inner call each to clear that
  satellite's Sophon peer.
- Sophon: 10 inner calls to clear Sophon peers for all five satellites, set the
  temporary Sophon -> Ethereum peer, and configure the Sophon -> Ethereum
  route.

Batch 2 has 7 Safe transactions with 50 inner calls:

- Ethereum: 19 inner calls to clear the temporary Ethereum -> Sophon peer,
  configure Ethereum -> satellite routes, and set Ethereum peers for all five
  satellites.
- Arbitrum, Base, Beam, BSC, and Polygon: 6 inner calls each to configure and
  set that satellite's Ethereum peer.
- Sophon: 1 inner call to clear the temporary Sophon -> Ethereum peer.

Ethereum remains EOA-owned for batch 1 migration calldata. The EOA signs 4 calls
in batch 1 and 2 ownership/delegate handoff calls from
`safe/ethereum-migration/prepared-calldata/03-ethereum-eoa-calldata.json`.

## Batch 1: Start Migration

Queue these Safe Transaction Builder files ahead of time, but execute them only
when the migration starts:

```text
safe/ethereum-migration/prepared-calldata/safe-transaction-builder/01-start-*.json
```

Batch 1 does this:

- Sets only Sophon <-> satellite peers to `bytes32(0)` in both directions.
- Leaves satellite <-> satellite peers untouched.
- On Sophon, configures the temporary Sophon -> Ethereum route and sets the
  Sophon peer for Ethereum EID `30101` to the new Ethereum adapter.
- On Ethereum, uses the owner EOA calldata to configure the receive side for
  Sophon and set the Ethereum peer for Sophon EID `30334` to the legacy Sophon
  adapter.

You can queue the Safe batches in advance. The last signer should sign and
execute only when ready to start the migration.

Ethereum EOA batch 1 is in:

```text
safe/ethereum-migration/prepared-calldata/03-ethereum-eoa-calldata.json
```

Use the `batch1StartMigration.transactions` array.

## Batch 2: Final Reconnect

Queue these Safe Transaction Builder files ahead of time, but execute them only
after the migration is complete and verification passes:

```text
safe/ethereum-migration/prepared-calldata/safe-transaction-builder/02-final-*.json
```

Batch 2 does this:

- Clears the temporary Sophon/Ethereum peer route.
- Configures LayerZero libraries, ULN/DVN config, executor config, and enforced
  options for Ethereum <-> satellite routes where needed.
- Sets Ethereum <-> satellite peers in both directions.
- Leaves satellite <-> satellite peers untouched.

Ethereum batch 2 is in the Ethereum Safe Transaction Builder file:

```text
safe/ethereum-migration/prepared-calldata/safe-transaction-builder/02-final-ethereum-1.json
```

Execute it only after the EOA has executed
`ownershipTransferToSafe.transactions`.

The legacy Sophon `NativeOFTAdapter` is not part of the final graph.

## LayerZero CLI Checks

Use the LayerZero CLI for inspection and dry-run review. Zero-peer disconnect
transactions are explicit calldata because `lz:oapp:wire` wires declared
pathways and does not emit removals for omitted pathways.

Preflight current mesh:

```bash
npx hardhat lz:oapp:peers:get --oapp-config layerzero.config.migration.00-current-sophon-mesh.ts
npx hardhat lz:oapp:config:get --oapp-config layerzero.config.migration.00-current-sophon-mesh.ts
MESH_MODE=current ./scripts/lzcheck.sh
```

Review batch 1 Sophon <-> Ethereum wiring with the LayerZero CLI:

```bash
npx hardhat lz:oapp:wire --oapp-config layerzero.config.migration.01-sophon-ethereum.ts --dry-run --ci
npx hardhat lz:oapp:wire --oapp-config layerzero.config.migration.01-sophon-ethereum.ts --safe --dry-run --ci
```

Review batch 2 Ethereum <-> satellite wiring with the LayerZero CLI:

```bash
npx hardhat lz:oapp:wire --oapp-config layerzero.config.migration.02-ethereum-satellites.ts --dry-run --ci
npx hardhat lz:oapp:wire --oapp-config layerzero.config.migration.02-ethereum-satellites.ts --safe --dry-run --ci
```

Review the full post-migration graph with the LayerZero CLI:

```bash
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts --dry-run --ci
npx hardhat lz:oapp:peers:get --oapp-config layerzero.config.ts
npx hardhat lz:oapp:config:get --oapp-config layerzero.config.ts
./scripts/lzcheck.sh
```

Before signing any queued batch, preview the decoded Safe transactions and
confirm the target chain, target contract, function, calldata, and peer EID.

## Verification

Before batch 1:

```bash
cast call 0xb09F17b1c52DCC6870070047e1D84e3Aab1c4DD1 "token()(address)" --rpc-url "$RPC_URL_ETHEREUM"
cast call 0xb09F17b1c52DCC6870070047e1D84e3Aab1c4DD1 "endpoint()(address)" --rpc-url "$RPC_URL_ETHEREUM"
cast call 0xb09F17b1c52DCC6870070047e1D84e3Aab1c4DD1 "owner()(address)" --rpc-url "$RPC_URL_ETHEREUM"
cast call 0x1a44076050125825900e736c501f859c50fE728c "delegates(address)(address)" 0xb09F17b1c52DCC6870070047e1D84e3Aab1c4DD1 --rpc-url "$RPC_URL_ETHEREUM"
```

Expected:

- `token()` = `0x6b7774cb12ed7573a7586e7d0e62a2a563ddd3f0`
- `endpoint()` = `0x1a44076050125825900e736c501f859c50fe728c`
- `owner()` = `0x50B238788747B26c408681283D148659F9da7Cf9`
- `delegates(adapter)` = `0x50B238788747B26c408681283D148659F9da7Cf9`

After batch 1:

- Sophon peers for BSC, Base, Polygon, Arbitrum, and Beam should be zero.
- BSC, Base, Polygon, Arbitrum, and Beam peers for Sophon EID `30334` should be
  zero.
- Satellite <-> satellite peers should remain unchanged.
- Sophon `peers(30101)` should point to the new Ethereum adapter.
- Ethereum `peers(30334)` should point to the legacy Sophon adapter.

After the ownership handoff, before batch 2:

```bash
cast call 0xb09F17b1c52DCC6870070047e1D84e3Aab1c4DD1 "owner()(address)" --rpc-url "$RPC_URL_ETHEREUM"
cast call 0x1a44076050125825900e736c501f859c50fE728c "delegates(address)(address)" 0xb09F17b1c52DCC6870070047e1D84e3Aab1c4DD1 --rpc-url "$RPC_URL_ETHEREUM"
```

Expected owner and delegate:

```text
0x3b181838Ae9DB831C17237FAbD7c10801Dd49fcD
```

After batch 2:

```bash
npx hardhat lz:oapp:peers:get --oapp-config layerzero.config.ts
npx hardhat lz:oapp:config:get --oapp-config layerzero.config.ts
./scripts/lzcheck.sh
```

Expected final source chains:

- Ethereum
- BSC
- Base
- Polygon
- Arbitrum
- Beam

## Refresh Rules

Regenerate the transaction set if any of these change before execution:

- adapter or OFT contract address
- owner or delegate
- Safe address
- LayerZero config contents
- already-submitted Safe transaction nonce/order
- LayerZero package versions
