# Phase 03: Remove Temporary Drain Route

Purpose: remove the temporary Ethereum/Sophon peer state after the exact-balance
drain bridge has delivered and balances have been verified.

LayerZero's CLI wires pathways declared in the config. It does not generate
`setPeer(eid, bytes32(0))` removals for pathways omitted from a config.

Use `fallback-set-peer-zero.json` for this phase. Execute the Ethereum row from
the current owner EOA and the Sophon row through the Sophon Safe.

Verification gate:

```bash
cast call 0xb09F17b1c52DCC6870070047e1D84e3Aab1c4DD1 "peers(uint32)(bytes32)" 30334 --rpc-url "$RPC_URL_ETHEREUM"
cast call 0x70ff61C1436d19090321A312b1f4be89D62ac55C "peers(uint32)(bytes32)" 30101 --rpc-url "$RPC_URL_SOPHON"
```

The Ethereum/Sophon peers should be zero/missing before final mesh wiring.
