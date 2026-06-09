# Ethereum Migration Safe Transactions

This folder groups Safe transaction preparation by migration phase. Prefer the
LayerZero CLI commands in each phase README. Use fallback calldata artifacts
only when the CLI preview does not emit the needed zero-peer transactions.

Do not execute a later phase until the previous phase's verification gate has
passed.

## Owner Safes

- BSC, Base, Polygon, Arbitrum: `0x3b181838Ae9DB831C17237FAbD7c10801Dd49fcD`
- Sophon: `0xa3b1f968b608642dD16d7Fd31bEc0B2c915908dB`
- Beam: `0xa72D557fB4E4A1a662fCE7cf506Ff593E5c90D3b`

The Ethereum adapter remains EOA-owned during migration:

```text
0x50B238788747B26c408681283D148659F9da7Cf9
```

Run Ethereum adapter configuration without `--safe` until final migration
verification passes. Then transfer owner/delegate to the Ethereum Safe:

```text
0x3b181838Ae9DB831C17237FAbD7c10801Dd49fcD
```

## Refresh Rules

Regenerate or re-preview the phase if any of these change before execution:

- adapter or OFT contract address
- owner or delegate
- Safe address
- LayerZero config file contents
- old Sophon adapter balance
- any already-submitted Safe transaction nonce/order
