# Ethereum Migration Transactions

This folder contains one prepared transaction set for the Ethereum OFT
migration:

```text
prepared-calldata/
```

Generate or refresh it with:

```bash
pnpm exec ts-node scripts/generateMigrationCalldata.ts
```

The generator clears stale prepared calldata before writing new files, so old
runs should not remain in this directory.

Verify the prepared Safe transaction set with:

```bash
pnpm exec ts-node scripts/verifyMigrationSafeTxs.ts
```

This checks the Safe Transaction Builder files against the aggregate JSON,
confirms the EOA calldata counts, and rejects satellite <-> satellite peer
writes.

## Signing Surface

There are 13 Safe transactions total: one transaction per Safe-owned chain in
batch 1 and one transaction per Safe-owned final chain in batch 2.

- Batch 1: 6 Safe transactions, 15 inner calls.
- Batch 2: 7 Safe transactions, 50 inner calls.
- Ethereum EOA calldata: 4 calls in batch 1 and 2 ownership/delegate handoff
  calls.

## Owner Safes

- BSC, Base, Polygon, Arbitrum: `0x3b181838Ae9DB831C17237FAbD7c10801Dd49fcD`
- Sophon: `0xa3b1f968b608642dD16d7Fd31bEc0B2c915908dB`
- Beam: `0xa72D557fB4E4A1a662fCE7cf506Ff593E5c90D3b`

The Ethereum adapter remains EOA-owned during migration:

```text
0x50B238788747B26c408681283D148659F9da7Cf9
```

Use `prepared-calldata/03-ethereum-eoa-calldata.json` for the Ethereum batch 1
owner transactions and the ownership/delegate handoff.

## Execution Order

Batch 1 starts the migration. It disconnects Sophon <-> satellite peers in both
directions, leaves satellite <-> satellite peers untouched, and configures the
temporary Sophon <-> Ethereum route.

After batch 1 verification, execute the Ethereum EOA
`ownershipTransferToSafe.transactions` calls to set the Ethereum adapter
delegate and owner to the Ethereum Safe.

Batch 2 runs only after migration verification passes and the Ethereum ownership
handoff is complete. It clears the temporary Sophon/Ethereum peer route and
connects Ethereum <-> satellite peers in both directions. It does not touch
satellite <-> satellite peers.

Ethereum batch 2 uses this Safe:

```text
0x3b181838Ae9DB831C17237FAbD7c10801Dd49fcD
```
