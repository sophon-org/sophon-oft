// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";

contract SophonTokenOFT is OFT {

    string public constant NAME = "Sophon";
    string public constant SYMBOL = "SOPH";

    constructor(
        address _lzEndpoint,
        address _delegate
    ) OFT(NAME, SYMBOL, _lzEndpoint, _delegate) Ownable(_delegate) {}
}
