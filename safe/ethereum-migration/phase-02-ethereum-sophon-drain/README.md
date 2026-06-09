# Phase 02: Temporary Ethereum to Sophon Drain Route

Purpose: configure the temporary Ethereum ERC20 OFTAdapter send side and legacy
Sophon NativeOFTAdapter receive side used only to drain the old adapter balance.

Prepare and execute the Ethereum EOA-owned side without `--safe`:

```bash
npx hardhat lz:oapp:wire --oapp-config layerzero.config.migration.02-drain-ethereum-eoa.ts
```

Prepare and submit the Sophon Safe-owned receive side:

```bash
npx hardhat lz:oapp:wire --oapp-config layerzero.config.migration.02-drain-sophon-safe.ts --safe
```

Expected networks: Ethereum through the EOA, Sophon through the Sophon Safe.
The Sophon-side config must not include Sophon send-side settings back to
Ethereum.

Verification gate:

```bash
npx hardhat lz:oapp:peers:get --oapp-config layerzero.config.migration.02-drain-ethereum-eoa.ts
npx hardhat lz:oapp:peers:get --oapp-config layerzero.config.migration.02-drain-sophon-safe.ts
npx hardhat lz:oapp:config:get --oapp-config layerzero.config.migration.02-drain-ethereum-eoa.ts
npx hardhat lz:oapp:config:get --oapp-config layerzero.config.migration.02-drain-sophon-safe.ts
```

Only after verification, bridge exactly the old Sophon adapter locked SOPH
amount from Ethereum to the specified Sophon recipient wallet. Do not use this
temporary route for user traffic.
