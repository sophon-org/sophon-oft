# Phase 01: Disconnect Old Sophon Routes

Purpose: remove all peers involving the legacy Sophon NativeOFTAdapter before
temporarily wiring Ethereum to Sophon for the drain.

LayerZero's CLI wires declared pathways. It does not generate
`setPeer(eid, bytes32(0))` transactions for omitted routes.

Use `fallback-set-peer-zero.json` to create the removal transactions.

Verification gate:

```bash
MESH_MODE=current ./scripts/lzcheck.sh
```

The old Sophon peer rows should report `MISSING` for all removed Sophon routes.
Do not proceed if any old Sophon peer remains non-zero.
