# SOPH Ethereum OFTAdapter Migration

This runbook migrates the SOPH LayerZero mesh from the legacy Sophon
`NativeOFTAdapter` to the Ethereum `OFTAdapter` deployed at
`0xb09F17b1c52DCC6870070047e1D84e3Aab1c4DD1`.

Use the LayerZero Hardhat CLI wherever possible. Use fallback calldata only for
peer removals if `lz:oapp:wire` does not generate zero-peer transactions.

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

The Ethereum adapter is currently owned by
`0x50B238788747B26c408681283D148659F9da7Cf9`.

Keep the Ethereum adapter owned by this EOA until the migration is complete and
the final mesh has been verified. During migration, run Ethereum adapter
configuration without `--safe` from the owner EOA. Use Safe transactions only
for the Safe-owned non-Ethereum OApps.

After final migration verification, transfer Ethereum adapter ownership and
delegate to the Ethereum Safe:

```text
0x3b181838Ae9DB831C17237FAbD7c10801Dd49fcD
```

Post-migration transfer command:

```bash
npx hardhat run scripts/transferOwnership.ts --network ethereum
```

## Before Starting

1. Coordinate with Stargate and any other UI operators to disable SOPH routes to
   or from Sophon before peer changes begin.
2. Confirm all Safe signers understand that Safe transactions can be prepared in
   advance, but must be executed phase by phase only after each verification
   gate passes.
3. Confirm no user-facing UI points to the temporary Ethereum/Sophon drain route.
4. Fund the executor/signing accounts with native gas on every involved chain.
5. Use authenticated RPC URLs in `.env` where possible.

## Preflight Checks

LayerZero's production checklist treats every direction as a separate pathway.
For each migration phase, verify:

- peers are set or removed in both required directions
- DVN configuration has at least two independent required DVNs
- executor configuration has a nonzero executor and nonzero max message size
- enforced options are present for message type `1`
- owner and delegate are the expected EOA or Safe for that phase

Verify the Ethereum adapter:

```bash
cast call 0xb09F17b1c52DCC6870070047e1D84e3Aab1c4DD1 "token()(address)" --rpc-url "$RPC_URL_ETHEREUM"
cast call 0xb09F17b1c52DCC6870070047e1D84e3Aab1c4DD1 "endpoint()(address)" --rpc-url "$RPC_URL_ETHEREUM"
cast call 0xb09F17b1c52DCC6870070047e1D84e3Aab1c4DD1 "owner()(address)" --rpc-url "$RPC_URL_ETHEREUM"
cast call 0x1a44076050125825900e736c501f859c50fE728c "delegates(address)(address)" 0xb09F17b1c52DCC6870070047e1D84e3Aab1c4DD1 --rpc-url "$RPC_URL_ETHEREUM"
```

Expected:

- `token()` = `0x6b7774cb12ed7573a7586e7d0e62a2a563ddd3f0`
- `endpoint()` = `0x1a44076050125825900e736c501f859c50fe728c`
- `owner()` = `0x50B238788747B26c408681283D148659F9da7Cf9` until final migration verification
- `delegates(adapter)` = `0x50B238788747B26c408681283D148659F9da7Cf9` until final migration verification

Verify the current Sophon mesh:

```bash
npx hardhat lz:oapp:peers:get --oapp-config layerzero.config.migration.00-current-sophon-mesh.ts
npx hardhat lz:oapp:config:get --oapp-config layerzero.config.migration.00-current-sophon-mesh.ts
MESH_MODE=current ./scripts/lzcheck.sh
```

For every phase config, treat each `from -> to` row as a directional pathway.
Before executing any generated transaction batch, preview the decoded
transactions and confirm the config includes explicit peers, send/receive
libraries, DVN ULN config, executor config where a chain is allowed to send,
and enforced receive options. Do not rely on LayerZero endpoint defaults.

## Safe Transaction Preparation

Prepare phase batches in advance from `safe/ethereum-migration/`, but execute
only after each phase gate passes.

For Safe-owned phases:

```bash
npx hardhat lz:oapp:wire --oapp-config <phase-config> --safe
```

For Ethereum adapter phases before the final ownership transfer, use the split
EOA config and run without `--safe` from the current owner EOA:

```bash
npx hardhat lz:oapp:wire --oapp-config <ethereum-eoa-phase-config>
```

When prompted, preview transactions and confirm the target networks, contracts,
function names, and decoded arguments before submission.

To obtain raw calldata for the EOA-owned Ethereum phases without submitting
transactions, use:

```bash
npx hardhat lz:oapp:wire --oapp-config layerzero.config.migration.02-drain-ethereum-eoa.ts --dry-run --ci
npx hardhat lz:oapp:wire --oapp-config layerzero.config.migration.04-final-ethereum-eoa.ts --dry-run --ci
```

The CLI output includes the target address and `Data` for each required
`setPeer`, library, config, and enforced-options transaction. Regenerate this
output immediately before execution so the raw bytes match the current on-chain
state and package metadata.

Peer removals are not represented as LayerZero config files:

1. LayerZero's CLI wires declared pathways.
2. Empty or omitted pathways do not generate `setPeer(eid, bytes32(0))`
   transactions.
3. Use the matching zero-peer calldata artifact for peer-removal phases.

Fallback artifacts:

- `safe/ethereum-migration/phase-01-disconnect-sophon-mesh/fallback-set-peer-zero.json`
- `safe/ethereum-migration/phase-03-remove-drain-route/fallback-set-peer-zero.json`

## Phase -01: Ethereum Adapter Deployment

For this migration, the Ethereum `SophonTokenOFTAdapter` has already been
deployed manually at:

```text
0xb09F17b1c52DCC6870070047e1D84e3Aab1c4DD1
```

Do not redeploy it for this migration. The repository deployment record is in
`deployments/ethereum/SophonTokenOFTAdapter.json`, and
`deploy/SophonTokenOFTAdapter.ts` now supports future Ethereum adapter
deployments using `hardhat.config.ts` network `oftAdapter.tokenAddress`.

If a future redeploy is intentionally required, the deployment command is:

```bash
npx hardhat deploy --tags SophonTokenOFTAdapter --network ethereum
```

After any deployment, repeat the Ethereum adapter preflight checks above before
continuing.

## Phase 00: Current State Snapshot

No Safe transactions.

Commands:

```bash
npx hardhat lz:oapp:peers:get --oapp-config layerzero.config.migration.00-current-sophon-mesh.ts
MESH_MODE=current ./scripts/lzcheck.sh
```

Proceed only if the current state is understood and Stargate has disabled SOPH
routes to or from Sophon.

## Phase 01: Disconnect Old Sophon Routes

LayerZero's CLI does not remove omitted peers. Use the explicit zero-peer
transactions in:

```text
safe/ethereum-migration/phase-01-disconnect-sophon-mesh/fallback-set-peer-zero.json
```

This removes:

- Sophon adapter peers for BSC, Base, Polygon, Arbitrum, and Beam.
- BSC, Base, Polygon, Arbitrum, and Beam peers for Sophon EID `30334`.

Verification:

```bash
cast call 0x70ff61C1436d19090321A312b1f4be89D62ac55C "peers(uint32)(bytes32)" 30102 --rpc-url "$RPC_URL_SOPHON"
cast call 0x70ff61C1436d19090321A312b1f4be89D62ac55C "peers(uint32)(bytes32)" 30184 --rpc-url "$RPC_URL_SOPHON"
cast call 0x70ff61C1436d19090321A312b1f4be89D62ac55C "peers(uint32)(bytes32)" 30109 --rpc-url "$RPC_URL_SOPHON"
cast call 0x70ff61C1436d19090321A312b1f4be89D62ac55C "peers(uint32)(bytes32)" 30110 --rpc-url "$RPC_URL_SOPHON"
cast call 0x70ff61C1436d19090321A312b1f4be89D62ac55C "peers(uint32)(bytes32)" 30198 --rpc-url "$RPC_URL_SOPHON"
```

Each value must be `bytes32(0)`. Also verify each satellite peer for Sophon EID
`30334` is zero before proceeding.

## Phase 02: Temporary Ethereum/Sophon Drain Route

Configure the Ethereum EOA-owned side first:

```bash
npx hardhat lz:oapp:wire --oapp-config layerzero.config.migration.02-drain-ethereum-eoa.ts
```

Configure the Sophon Safe-owned receive side second:

```bash
npx hardhat lz:oapp:wire --oapp-config layerzero.config.migration.02-drain-sophon-safe.ts --safe
```

The Phase 02 configs are intentionally asymmetric:

- `layerzero.config.migration.02-drain-ethereum-eoa.ts` configures the Ethereum
  adapter peer and send-side security settings for Ethereum -> Sophon.
- `layerzero.config.migration.02-drain-sophon-safe.ts` configures the Sophon
  adapter peer and receive-side security settings for Ethereum -> Sophon.
- The Sophon-side temporary config must not configure Sophon send-side settings
  back to Ethereum.

Verification:

```bash
npx hardhat lz:oapp:peers:get --oapp-config layerzero.config.migration.02-drain-ethereum-eoa.ts
npx hardhat lz:oapp:peers:get --oapp-config layerzero.config.migration.02-drain-sophon-safe.ts
npx hardhat lz:oapp:config:get --oapp-config layerzero.config.migration.02-drain-ethereum-eoa.ts
npx hardhat lz:oapp:config:get --oapp-config layerzero.config.migration.02-drain-sophon-safe.ts
```

The temporary route must be used only for the exact-balance drain from Ethereum
to Sophon. Do not expose it in Stargate or any other UI.

## Phase 02A: Exact-Balance Drain Bridge

Immediately before bridging, read the old Sophon adapter native SOPH balance:

```bash
cast balance 0x70ff61C1436d19090321A312b1f4be89D62ac55C --rpc-url "$RPC_URL_SOPHON"
```

Let this value be `DRAIN_AMOUNT_WEI`.

Prepare the Ethereum source wallet or Safe with exactly enough SOPH ERC20 and
ETH for gas and LayerZero fees. If the source is a Safe, prepare the approve and
send transactions only after `DRAIN_AMOUNT_WEI` is final.

Bridge parameters:

- source adapter: `0xb09F17b1c52DCC6870070047e1D84e3Aab1c4DD1`
- destination EID: `30334`
- amountLD: `DRAIN_AMOUNT_WEI`
- minAmountLD: `DRAIN_AMOUNT_WEI`
- destination recipient: Sophon treasury/wallet that should receive the drained
  native SOPH
- extra options: at least the enforced receive gas from the config
- composeMsg: `0x`
- oftCmd: `0x`

After sending, wait for LayerZero delivery and verify:

```bash
cast balance 0x70ff61C1436d19090321A312b1f4be89D62ac55C --rpc-url "$RPC_URL_SOPHON"
cast call 0x6b7774cb12ed7573a7586e7d0e62a2a563ddd3f0 "balanceOf(address)(uint256)" 0xb09F17b1c52DCC6870070047e1D84e3Aab1c4DD1 --rpc-url "$RPC_URL_ETHEREUM"
```

Expected:

- legacy Sophon adapter balance decreased by exactly `DRAIN_AMOUNT_WEI`
- Ethereum adapter ERC20 balance increased by exactly `DRAIN_AMOUNT_WEI`
- Sophon recipient received exactly `DRAIN_AMOUNT_WEI`

Do not proceed if any amount differs.

## Phase 03: Remove Temporary Drain Route

LayerZero's CLI wires pathways declared in the config. It does not generate
`setPeer(eid, bytes32(0))` removals for pathways omitted from a config. Use the
explicit zero-peer transactions in:

```text
safe/ethereum-migration/phase-03-remove-drain-route/fallback-set-peer-zero.json
```

Execute the Ethereum row from the owner EOA and the Sophon row through the
Sophon Safe.

These two transactions are small and deterministic:

- Ethereum adapter: `setPeer(30334, bytes32(0))`
- Sophon adapter: `setPeer(30101, bytes32(0))`

Verification:

```bash
cast call 0xb09F17b1c52DCC6870070047e1D84e3Aab1c4DD1 "peers(uint32)(bytes32)" 30334 --rpc-url "$RPC_URL_ETHEREUM"
cast call 0x70ff61C1436d19090321A312b1f4be89D62ac55C "peers(uint32)(bytes32)" 30101 --rpc-url "$RPC_URL_SOPHON"
```

The Ethereum peer for Sophon EID `30334` and the Sophon peer for Ethereum EID
`30101` should be zero or missing.

## Phase 04: Final Ethereum Mesh

Configure the Ethereum EOA-owned side first:

```bash
npx hardhat lz:oapp:wire --oapp-config layerzero.config.migration.04-final-ethereum-eoa.ts
```

Configure the Safe-owned satellite sides second:

```bash
npx hardhat lz:oapp:wire --oapp-config layerzero.config.migration.04-final-satellite-safes.ts --safe
```

Verification:

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

The legacy Sophon `NativeOFTAdapter` must not be in the final graph.

## Phase 05: Transfer Ethereum Adapter To Safe

After Phase 04 verification passes, transfer the Ethereum adapter owner and
delegate to the Ethereum Safe:

```bash
npx hardhat run scripts/transferOwnership.ts --network ethereum
```

Verify:

```bash
cast call 0xb09F17b1c52DCC6870070047e1D84e3Aab1c4DD1 "owner()(address)" --rpc-url "$RPC_URL_ETHEREUM"
cast call 0x1a44076050125825900e736c501f859c50fE728c "delegates(address)(address)" 0xb09F17b1c52DCC6870070047e1D84e3Aab1c4DD1 --rpc-url "$RPC_URL_ETHEREUM"
```

Expected owner and delegate:

```text
0x3b181838Ae9DB831C17237FAbD7c10801Dd49fcD
```

## UI Updates

After final verification:

1. Notify Stargate and any other UIs that SOPH routes should use the Ethereum
   adapter address.
2. Remove old Sophon adapter routing from UI configuration.
3. Confirm test sends through non-Sophon routes before reopening broad user
   traffic.

## Abort Points

- Before Phase 01: no on-chain migration changes have been made.
- After Phase 01 and before Phase 02: old Sophon routes are blocked; restore by
  re-running `layerzero.config.migration.00-current-sophon-mesh.ts` if needed.
- After Phase 02 and before drain send: remove the temporary route if aborting.
- After drain send: do not reconnect final routes until balances match exactly.
- After Phase 04: rollback requires a new reviewed plan because collateral has
  moved to the Ethereum adapter.
- After Phase 05: Ethereum adapter administration is Safe-controlled.
