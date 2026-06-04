// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { SophonTokenNativeOFTAdapter } from "../SophonTokenNativeOFTAdapter.sol";

// @dev WARNING: This is for testing purposes only
contract MyOFTAdapterMock is SophonTokenNativeOFTAdapter {
    constructor(address _lzEndpoint, address _delegate) SophonTokenNativeOFTAdapter(_lzEndpoint, _delegate) {}
}
