#!/usr/bin/env bash
#
# lzcheck.sh
# ---------
# Audit the Sophon OFT / OApp configuration across every routed source chain.
# For each (source chain -> remote EID) pathway this script:
#   1. Checks peers(remoteEid) on the source OApp and verifies it points at
#      the expected OFT on that remote chain (MATCH / MISSING / MISMATCH).
#   2. Resolves the ReceiveUln302 library from the source chain's LZ Endpoint.
#   3. Reads the ULN config and flags pathways with fewer than
#      MIN_REQUIRED_DVNS required DVNs as EXPOSED.
#
# EXPOSED means a single compromised DVN could forge messages on that
# pathway. We require >=2 required DVNs to consider a pathway safe.
#
# Usage:
#   ./lzcheck.sh                # audit every source chain
#   ./lzcheck.sh <chain>        # audit only one source chain (name or EID)
#                               # valid: sophon | bsc | base | polygon | arbitrum | beam
#                               #   or:  30334  30102 30184 30109    30110      30198
#
# Env overrides (optional):
#   RPC_URL_SOPHON, RPC_URL_BSC, RPC_URL_BASE,
#   RPC_URL_POLYGON, RPC_URL_ARBITRUM, RPC_URL_BEAM
#   RPC_MAX_ATTEMPTS  retry count per call     (default 4)
#   RPC_BASE_DELAY    first retry delay in sec (default 1, doubles)
#   RPC_PACE_DELAY    pause between calls      (default 0.15)
#
# Public RPCs (mainnet.base.org, *.drpc.org) rate-limit quickly. Point the
# RPC_URL_* vars at an authenticated endpoint (Alchemy/Infura/QuickNode) if
# you see "endpoint error" rows on a clean re-run.
#
# Requires: curl

set -euo pipefail

MIN_REQUIRED_DVNS=2

# EID -> chain name (includes Ethereum for remote-side naming even though
# we don't audit an OFT on Ethereum).
# Ethereum=30101 BSC=30102 Polygon=30109 Arbitrum=30110 Base=30184
# Beam=30198 Sophon=30334
chain_name() {
  case "$1" in
    30101) echo "Ethereum" ;;
    30102) echo "BSC" ;;
    30109) echo "Polygon" ;;
    30110) echo "Arbitrum" ;;
    30184) echo "Base" ;;
    30198) echo "Beam" ;;
    30334) echo "Sophon" ;;
    *)     echo "EID:$1" ;;
  esac
}

# Source chains to audit. Each row: "Name|EID|OApp|RPC".
# Ethereum is skipped (no OFT deployed there).
CHAINS=(
  "Sophon|30334|0x70ff61C1436d19090321A312b1f4be89D62ac55C|${RPC_URL_SOPHON:-https://rpc.sophon.xyz}"
  "BSC|30102|0x31DbA3c96481FDe3CD81C2aaF51F2D8bf618C742|${RPC_URL_BSC:-https://bsc.drpc.org}"
  "Base|30184|0x31DbA3c96481FDe3CD81C2aaF51F2D8bf618C742|${RPC_URL_BASE:-https://mainnet.base.org}"
  "Polygon|30109|0xEb971Fd26783f32694dbB392dD7289de23109148|${RPC_URL_POLYGON:-https://polygon.drpc.org}"
  "Arbitrum|30110|0x31DbA3c96481FDe3CD81C2aaF51F2D8bf618C742|${RPC_URL_ARBITRUM:-https://arb1.arbitrum.io/rpc}"
  "Beam|30198|0x31DbA3c96481FDe3CD81C2aaF51F2D8bf618C742|${RPC_URL_BEAM:-https://build.onbeam.com/rpc}"
)

# Remote EIDs considered when auditing each source chain. The source's own
# EID is skipped inside the loop.
ALL_EIDS=(30102 30109 30110 30184 30198 30334)

# Function selectors (first 4 bytes of keccak256)
# endpoint()                        => 0x5e280f11
# peers(uint32)                     => 0xbb0b6a53
# getReceiveLibrary(address,uint32) => 0x402f8468
# getUlnConfig(address,uint32)      => 0x43ea4fa9
SEL_ENDPOINT="0x5e280f11"
SEL_PEERS="0xbb0b6a53"
SEL_GET_RECV_LIB="0x402f8468"
SEL_GET_ULN_CFG="0x43ea4fa9"

ZERO_WORD="0000000000000000000000000000000000000000000000000000000000000000"

# Build EID -> expected peer address map (lowercase, no 0x) from the FULL
# CHAINS table. This must happen before any filtering so cross-chain peer
# checks still work when auditing a single source chain.
declare -A EXPECTED_PEERS
for ROW in "${CHAINS[@]}"; do
  IFS='|' read -r _N _EID _OA _R <<< "$ROW"
  EXPECTED_PEERS[$_EID]="$(echo "${_OA#0x}" | tr '[:upper:]' '[:lower:]')"
done

# Optional CLI arg: restrict audit to a single source chain (name or EID).
FILTER="${1:-}"
if [ -n "$FILTER" ]; then
  FILTER_LC="$(echo "$FILTER" | tr '[:upper:]' '[:lower:]')"
  FILTERED=()
  for ROW in "${CHAINS[@]}"; do
    IFS='|' read -r _N _EID _OA _R <<< "$ROW"
    _N_LC="$(echo "$_N" | tr '[:upper:]' '[:lower:]')"
    if [ "$_N_LC" = "$FILTER_LC" ] || [ "$_EID" = "$FILTER" ]; then
      FILTERED+=("$ROW")
    fi
  done
  if [ ${#FILTERED[@]} -eq 0 ]; then
    echo "ERROR: unknown chain '$FILTER'. Valid: Sophon BSC Base Polygon Arbitrum Beam (or their EIDs)." >&2
    exit 2
  fi
  CHAINS=("${FILTERED[@]}")
fi

CURL_OPTS=(-s --ssl-no-revoke --max-time 15)

# Tunables for handling rate-limited public RPCs.
RPC_MAX_ATTEMPTS="${RPC_MAX_ATTEMPTS:-4}"
RPC_BASE_DELAY="${RPC_BASE_DELAY:-1}"    # seconds; doubles each retry
RPC_PACE_DELAY="${RPC_PACE_DELAY:-0.15}" # pause between successful calls

# eth_call <rpc> <to> <data>  ->  raw hex result or "error"
# Retries on curl/HTTP/JSON-RPC errors with exponential backoff.
eth_call() {
  local rpc="$1" to="$2" data="$3"
  local payload="{\"jsonrpc\":\"2.0\",\"method\":\"eth_call\",\"params\":[{\"to\":\"$to\",\"data\":\"$data\"},\"latest\"],\"id\":1}"
  local attempt=1 delay="$RPC_BASE_DELAY" resp http_code body

  while [ "$attempt" -le "$RPC_MAX_ATTEMPTS" ]; do
    resp=$(curl "${CURL_OPTS[@]}" -w $'\n%{http_code}' -X POST "$rpc" \
      -H "Content-Type: application/json" \
      -d "$payload" 2>/dev/null) || resp=""

    http_code="${resp##*$'\n'}"
    body="${resp%$'\n'*}"

    if [ -n "$body" ] && [ "$http_code" = "200" ] && ! echo "$body" | grep -q '"error"'; then
      local result
      result=$(echo "$body" | sed -n 's/.*"result":"\([^"]*\)".*/\1/p')
      if [ -n "$result" ]; then
        sleep "$RPC_PACE_DELAY" 2>/dev/null || true
        echo "$result"
        return
      fi
    fi

    attempt=$((attempt + 1))
    if [ "$attempt" -le "$RPC_MAX_ATTEMPTS" ]; then
      sleep "$delay" 2>/dev/null || true
      delay=$((delay * 2))
    fi
  done

  echo "error"
}

pad_addr() {
  local raw="${1#0x}"
  printf "%064s" "$raw" | tr ' ' '0' | tr '[:upper:]' '[:lower:]'
}

pad_uint32() { printf "%064x" "$1"; }

word_at() {
  local hex="${1#0x}" idx="$2"
  local start=$((idx * 64))
  echo "${hex:$start:64}"
}

addr_from_word() {
  local w="$1"
  echo "0x${w:24:40}"
}

echo ""
echo "OFT DVN configuration audit"
echo "Audit rule: reqDVNs >= $MIN_REQUIRED_DVNS per pathway (else EXPOSED)"
echo "Columns:    reqDVNs = on-chain requiredDVNCount"
echo "            optThresh = on-chain optionalDVNThreshold"
echo "Source chains: Sophon, BSC, Base, Polygon, Arbitrum, Beam  (Ethereum skipped)"

TOTAL_EXPOSED=0
TOTAL_OK=0
TOTAL_PEER_ISSUES=0
TOTAL_RPC_ERRORS=0
TOTAL_CHECKED=0

for ROW in "${CHAINS[@]}"; do
  IFS='|' read -r SRC_NAME SRC_EID SRC_OAPP SRC_RPC <<< "$ROW"
  OAPP_PAD=$(pad_addr "$SRC_OAPP")

  echo ""
  echo "Source: $SRC_NAME (EID $SRC_EID)   RPC: $SRC_RPC"
  echo "  OApp: $SRC_OAPP"

  # Resolve the LZ Endpoint via the OApp's endpoint() getter — also validates
  # that the address is actually a LayerZero OApp on this chain.
  OAPP_ENDPOINT_RAW=$(eth_call "$SRC_RPC" "$SRC_OAPP" "$SEL_ENDPOINT")
  if [ "$OAPP_ENDPOINT_RAW" = "error" ] || [ -z "$OAPP_ENDPOINT_RAW" ] || [ "$OAPP_ENDPOINT_RAW" = "0x" ]; then
    echo "  ERROR: $SRC_OAPP is not a valid OApp on $SRC_NAME (endpoint() failed)."
    echo "  Skipping this source chain."
    continue
  fi
  ENDPOINT=$(addr_from_word "$(word_at "$OAPP_ENDPOINT_RAW" 0)")
  echo "  Endpoint: $ENDPOINT"
  echo ""

  printf "    %-10s  %-6s  %-8s  %-9s  %-9s  %-44s  %s\n" "chain" "EID" "reqDVNs" "optThresh" "peer" "recvLib" "verdict"
  printf "    %-10s  %-6s  %-8s  %-9s  %-9s  %-44s  %s\n" "----------" "------" "--------" "---------" "---------" "--------------------------------------------" "--------"

  for EID in "${ALL_EIDS[@]}"; do
    # Skip self
    [ "$EID" = "$SRC_EID" ] && continue

    EID_PAD=$(pad_uint32 "$EID")
    CHAIN=$(chain_name "$EID")

    # Step 0: peer check — peers(remoteEid) must match the expected OFT on that chain
    CALLDATA="${SEL_PEERS}${EID_PAD}"
    PEER_RAW=$(eth_call "$SRC_RPC" "$SRC_OAPP" "$CALLDATA")
    if [ "$PEER_RAW" = "error" ] || [ -z "$PEER_RAW" ] || [ "$PEER_RAW" = "0x" ]; then
      PEER_STATUS="ERR"
    else
      PEER_WORD=$(word_at "$PEER_RAW" 0)
      if [ "$PEER_WORD" = "$ZERO_WORD" ]; then
        PEER_STATUS="MISSING"
      else
        PEER_ADDR="${PEER_WORD:24:40}"
        EXPECTED="${EXPECTED_PEERS[$EID]:-}"
        if [ -n "$EXPECTED" ] && [ "$PEER_ADDR" = "$EXPECTED" ]; then
          PEER_STATUS="OK"
        else
          PEER_STATUS="MISMATCH"
        fi
      fi
    fi

    if [ "$PEER_STATUS" != "OK" ]; then
      TOTAL_PEER_ISSUES=$((TOTAL_PEER_ISSUES + 1))
    fi

    # Step 1: resolve ReceiveUln302 for this remote EID
    CALLDATA="${SEL_GET_RECV_LIB}${OAPP_PAD}${EID_PAD}"
    RAW=$(eth_call "$SRC_RPC" "$ENDPOINT" "$CALLDATA")

    if [ "$RAW" = "error" ] || [ -z "$RAW" ] || [ "$RAW" = "0x" ]; then
      printf "    %-10s  %-6s  %-8s  %-9s  %-9s  %-44s  %s\n" "$CHAIN" "$EID" "?" "?" "$PEER_STATUS" "" "endpoint error"
      TOTAL_CHECKED=$((TOTAL_CHECKED + 1))
      TOTAL_RPC_ERRORS=$((TOTAL_RPC_ERRORS + 1))
      continue
    fi

    RECV_LIB=$(addr_from_word "$(word_at "$RAW" 0)")

    # Step 2: read the ULN config from the resolved library
    CALLDATA="${SEL_GET_ULN_CFG}${OAPP_PAD}${EID_PAD}"
    RAW=$(eth_call "$SRC_RPC" "$RECV_LIB" "$CALLDATA")

    if [ "$RAW" = "error" ] || [ -z "$RAW" ] || [ "$RAW" = "0x" ]; then
      printf "    %-10s  %-6s  %-8s  %-9s  %-9s  %-44s  %s\n" "$CHAIN" "$EID" "?" "?" "$PEER_STATUS" "$RECV_LIB" "config error"
      TOTAL_CHECKED=$((TOTAL_CHECKED + 1))
      TOTAL_RPC_ERRORS=$((TOTAL_RPC_ERRORS + 1))
      continue
    fi

    # ABI decode: struct at offset 0x20
    # word 1: confirmations (uint64)
    # word 2: requiredDVNCount (uint8)
    # word 3: optionalDVNCount (uint8)
    # word 4: optionalDVNThreshold (uint8)
    REQ=$(printf "%d" "0x$(word_at "$RAW" 2)")
    THR=$(printf "%d" "0x$(word_at "$RAW" 4)")

    if [ "$REQ" -lt "$MIN_REQUIRED_DVNS" ]; then
      VERDICT="EXPOSED"
      TOTAL_EXPOSED=$((TOTAL_EXPOSED + 1))
    else
      VERDICT="OK"
      TOTAL_OK=$((TOTAL_OK + 1))
    fi
    TOTAL_CHECKED=$((TOTAL_CHECKED + 1))

    printf "    %-10s  %-6s  %-8s  %-9s  %-9s  %-44s  %s\n" "$CHAIN" "$EID" "$REQ" "$THR" "$PEER_STATUS" "$RECV_LIB" "$VERDICT"
  done
done

echo ""
echo "  Pathways scanned: $TOTAL_CHECKED   (OK: $TOTAL_OK  EXPOSED: $TOTAL_EXPOSED  RPC errors: $TOTAL_RPC_ERRORS)"
EXIT_CODE=0
if [ "$TOTAL_EXPOSED" -gt 0 ]; then
  echo "  $TOTAL_EXPOSED pathway(s) EXPOSED — requiredDVNCount < $MIN_REQUIRED_DVNS."
  echo "  Reconfigure affected pathways with >=$MIN_REQUIRED_DVNS independent required DVNs."
  EXIT_CODE=1
fi
if [ "$TOTAL_RPC_ERRORS" -gt 0 ]; then
  echo "  $TOTAL_RPC_ERRORS pathway(s) incomplete due to RPC errors — re-run or set RPC_URL_* to an authenticated endpoint."
  EXIT_CODE=1
fi
if [ "$TOTAL_PEER_ISSUES" -gt 0 ]; then
  echo "  $TOTAL_PEER_ISSUES peer issue(s): MISSING = no route set, MISMATCH = peer differs from expected OFT, ERR = RPC failure."
  EXIT_CODE=1
else
  echo "  All peer routes OK (every source chain is wired to every other)."
fi
if [ "$TOTAL_EXPOSED" -eq 0 ] && [ "$TOTAL_RPC_ERRORS" -eq 0 ]; then
  echo "  All $TOTAL_CHECKED checked pathways OK (>=$MIN_REQUIRED_DVNS required DVNs)."
fi
echo ""
exit "$EXIT_CODE"
