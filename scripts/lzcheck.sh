#!/usr/bin/env bash
#
# lzcheck.sh
# ---------
# Audit a LayerZero OFT / OApp's DVN configuration on Sophon.
# For each remote EID, resolves the ReceiveUln302 library from the LZ Endpoint,
# then prints the required DVN count, optional threshold, and a PASS / FAIL
# verdict. A verdict of EXPOSED means the pathway would accept a packet if a
# single DVN is compromised.
#
# Usage:
#   ./lzcheck.sh <YOUR_OAPP_ADDRESS> [EID1 EID2 ...]
#
# Example:
#   ./lzcheck.sh 0x70ff61C1436d19090321A312b1f4be89D62ac55C
#
# Requires: curl, python3 or python (for hex decoding)

set -euo pipefail

OAPP="${1:-0x70ff61C1436d19090321A312b1f4be89D62ac55C}"
shift || true

# Default EIDs: Sophon's active routes
# Ethereum=30101 BSC=30102 Polygon=30109 Arbitrum=30110 Base=30184 Beam=30198
EIDS=("$@")
if [ ${#EIDS[@]} -eq 0 ]; then
  EIDS=(30101 30102 30109 30110 30184 30198)
fi

# LZ EndpointV2 on Sophon
ENDPOINT="${LZ_ENDPOINT:-0x5c6cfF4b7C49805F8295Ff73C204ac83f3bC4AE7}"
RPC="${ETH_RPC_URL:-https://rpc.sophon.xyz}"

# Function selectors (first 4 bytes of keccak256)
# getReceiveLibrary(address,uint32) => 0x402f8468
# getUlnConfig(address,uint32)      => 0x43ea4fa9
SEL_GET_RECV_LIB="0x402f8468"
SEL_GET_ULN_CFG="0x43ea4fa9"

CURL_OPTS=(-s --ssl-no-revoke --max-time 10)

# eth_call helper — prints raw hex result or "error"
eth_call() {
  local to="$1" data="$2"
  local payload="{\"jsonrpc\":\"2.0\",\"method\":\"eth_call\",\"params\":[{\"to\":\"$to\",\"data\":\"$data\"},\"latest\"],\"id\":1}"
  local resp
  resp=$(curl "${CURL_OPTS[@]}" -X POST "$RPC" \
    -H "Content-Type: application/json" \
    -d "$payload" 2>/dev/null) || { echo "error"; return; }

  # Check for JSON-RPC error
  if echo "$resp" | grep -q '"error"'; then
    echo "error"
    return
  fi

  # Extract result field
  echo "$resp" | sed -n 's/.*"result":"\([^"]*\)".*/\1/p'
}

# Pad an address (strip 0x, lowercase, left-pad to 64 hex chars)
pad_addr() {
  local raw="${1#0x}"
  printf "%064s" "$raw" | tr ' ' '0' | tr '[:upper:]' '[:lower:]'
}

# Pad a uint32 to 64 hex chars
pad_uint32() {
  printf "%064x" "$1"
}

# Extract a 32-byte word from hex data (0-indexed word number)
word_at() {
  local hex="${1#0x}" idx="$2"
  local start=$((idx * 64))
  echo "${hex:$start:64}"
}

# Extract an address from a 32-byte word (last 20 bytes)
addr_from_word() {
  local w="$1"
  echo "0x${w:24:40}"
}

OAPP_PAD=$(pad_addr "$OAPP")

# Validate: call endpoint() on the address — a real OApp returns the LZ endpoint
# endpoint() selector: 0x5e280f11
OAPP_ENDPOINT=$(eth_call "$OAPP" "0x5e280f11")
if [ "$OAPP_ENDPOINT" = "error" ] || [ -z "$OAPP_ENDPOINT" ] || [ "$OAPP_ENDPOINT" = "0x" ]; then
  echo ""
  echo "  ERROR: $OAPP is not a valid OApp (no endpoint() function)." >&2
  echo "  Make sure the address is a deployed OFT / OApp on Sophon." >&2
  echo ""
  exit 1
fi

echo ""
echo "OApp / OFTAdapter DVN configuration audit"
echo "OApp:      $OAPP"
echo "Endpoint:  $ENDPOINT (EndpointV2, Sophon)"
echo ""
printf "  %-6s  %-8s  %-9s  %-44s  %s\n" "EID" "required" "threshold" "recvLib" "verdict"
printf "  %-6s  %-8s  %-9s  %-44s  %s\n" "------" "--------" "---------" "--------------------------------------------" "--------"

EXPOSED_COUNT=0

for EID in "${EIDS[@]}"; do
  EID_PAD=$(pad_uint32 "$EID")

  # Step 1: resolve the ReceiveUln302 library for this EID
  CALLDATA="${SEL_GET_RECV_LIB}${OAPP_PAD}${EID_PAD}"
  RAW=$(eth_call "$ENDPOINT" "$CALLDATA")

  if [ "$RAW" = "error" ] || [ -z "$RAW" ]; then
    printf "  %-6s  %-8s  %-9s  %-44s  %s\n" "$EID" "?" "?" "" "endpoint error"
    continue
  fi

  RECV_LIB=$(addr_from_word "$(word_at "$RAW" 0)")

  # Step 2: get the ULN config from the resolved library
  CALLDATA="${SEL_GET_ULN_CFG}${OAPP_PAD}${EID_PAD}"
  RAW=$(eth_call "$RECV_LIB" "$CALLDATA")

  if [ "$RAW" = "error" ] || [ -z "$RAW" ]; then
    printf "  %-6s  %-8s  %-9s  %-44s  %s\n" "$EID" "?" "?" "$RECV_LIB" "config error"
    continue
  fi

  # ABI decode: struct is at offset 0x20
  # word 1: confirmations (uint64)
  # word 2: requiredDVNCount (uint8)
  # word 3: optionalDVNCount (uint8)
  # word 4: optionalDVNThreshold (uint8)
  REQ=$(printf "%d" "0x$(word_at "$RAW" 2)")
  THR=$(printf "%d" "0x$(word_at "$RAW" 4)")
  SUM=$((REQ + THR))

  if [ "$SUM" -le 1 ]; then
    VERDICT="EXPOSED"
    EXPOSED_COUNT=$((EXPOSED_COUNT + 1))
  else
    VERDICT="OK"
  fi

  printf "  %-6s  %-8s  %-9s  %-44s  %s\n" "$EID" "$REQ" "$THR" "$RECV_LIB" "$VERDICT"
done

echo ""
if [ "$EXPOSED_COUNT" -gt 0 ]; then
  echo "  $EXPOSED_COUNT pathway(s) EXPOSED — requiredDVNCount + optionalDVNThreshold <= 1."
  echo "  Pause the adapter or reconfigure with >=2 independent DVNs per pathway."
else
  echo "  All checked pathways OK."
fi
echo ""
