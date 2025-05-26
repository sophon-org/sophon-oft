// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { SophonTokenOFTAdapter } from "../SophonTokenOFTAdapter.sol";

// @dev WARNING: This is for testing purposes only
contract MyOFTAdapterMock is SophonTokenOFTAdapter {
    constructor(address _lzEndpoint, address _delegate) SophonTokenOFTAdapter(_lzEndpoint, _delegate) {}
}
