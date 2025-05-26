// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.22;

import { NativeOFTAdapter } from "@layerzerolabs/oft-evm/contracts/NativeOFTAdapter.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract SophonTokenOFTAdapter is NativeOFTAdapter {
    
    uint8 public constant DECIMALS = 18;
    
    constructor(
        address _lzEndpoint,
        address _delegate
    ) NativeOFTAdapter(DECIMALS, _lzEndpoint, _delegate) Ownable(_delegate) {}
}
