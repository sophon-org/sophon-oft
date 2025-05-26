import { EndpointId } from '@layerzerolabs/lz-definitions'

import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

/**
 *  WARNING: ONLY 1 OFTAdapter should exist for a given global mesh.
 *  The token address for the adapter should be defined in hardhat.config. This will be used in deployment.
 *
 *  for example:
 *
 *    sepolia: {
 *         eid: EndpointId.SEPOLIA_V2_TESTNET,
 *         url: process.env.RPC_URL_SEPOLIA || 'https://rpc.sepolia.org/',
 *         accounts,
 *         oftAdapter: {
 *             tokenAddress: '0x0', // Set the token address for the OFT adapter
 *         },
 *     },
 */
const sophonContract: OmniPointHardhat = {
    eid: EndpointId.SOPHON_V2_MAINNET,
    contractName: 'SophonTokenOFTAdapter',
    address: '0x70ff61C1436d19090321A312b1f4be89D62ac55C',
}

const bscContract: OmniPointHardhat = {
    eid: EndpointId.BSC_V2_MAINNET,
    contractName: 'SophonTokenOFT',
    address: '0xb19e0b157F94E111e9B5d532B57ba72041e09710',
}

const baseContract: OmniPointHardhat = {
    eid: EndpointId.BASE_V2_MAINNET,
    contractName: 'SophonTokenOFT',
}

const polygonContract: OmniPointHardhat = {
    eid: EndpointId.POLYGON_V2_MAINNET,
    contractName: 'SophonTokenOFT',
}

const arbitrumContract: OmniPointHardhat = {
    eid: EndpointId.ARBITRUM_V2_MAINNET,
    contractName: 'SophonTokenOFT',
}



const config: OAppOmniGraphHardhat = {
    contracts: [
        {
            contract: sophonContract,
        },
        {
            contract: bscContract,
        },
        {
            contract: baseContract,
        },
        {
            contract: polygonContract,
        },
        {
            contract: arbitrumContract,
        },
    ],
    connections: [
        {
            from: fujiContract,
            to: sepoliaContract,
        },
        {
            from: fujiContract,
            to: amoyContract,
        },
        {
            from: sepoliaContract,
            to: fujiContract,
        },
        {
            from: sepoliaContract,
            to: amoyContract,
        },
        {
            from: amoyContract,
            to: sepoliaContract,
        },
        {
            from: amoyContract,
            to: fujiContract,
        },
    ],
}

export default config
