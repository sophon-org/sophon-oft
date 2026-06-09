# Drain Bridge Safe Template

These transactions cannot be finalized until the old Sophon adapter balance is
read immediately before the drain.

Set:

```text
DRAIN_AMOUNT_WEI = cast balance 0x70ff61C1436d19090321A312b1f4be89D62ac55C --rpc-url "$RPC_URL_SOPHON"
SOPHON_RECIPIENT = <Sophon wallet receiving drained native SOPH>
```

Prepare on Ethereum from the migration source wallet:

1. SOPH ERC20 `approve(adapter, DRAIN_AMOUNT_WEI)`
   - token: `0x6b7774cb12ed7573a7586e7d0e62a2a563ddd3f0`
   - spender: `0xb09F17b1c52DCC6870070047e1D84e3Aab1c4DD1`
2. Adapter `send(sendParam, fee, refundAddress)` with:
   - dstEid: `30334`
   - to: `bytes32(uint256(uint160(SOPHON_RECIPIENT)))`
   - amountLD: `DRAIN_AMOUNT_WEI`
   - minAmountLD: `DRAIN_AMOUNT_WEI`
   - extraOptions: receive gas option matching the migration config
   - composeMsg: `0x`
   - oftCmd: `0x`
   - native value: quoted `nativeFee`

Refresh the quote immediately before submitting the send transaction. If
`DRAIN_AMOUNT_WEI` changes, regenerate both transactions. Keeping the adapter
EOA-owned does not require the bridge source wallet to be the owner, but the
source wallet must hold and approve the exact SOPH amount.
