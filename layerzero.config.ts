import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'
import { OAppEdgeConfig, OAppEnforcedOption, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'
import { generateConnectionsConfig } from '@layerzerolabs/metadata-tools'

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
}

const bscContract: OmniPointHardhat = {
    eid: EndpointId.BSC_V2_MAINNET,
    contractName: 'SophonTokenOFT',
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

// Standard enforced options for mainnet chains
const MAINNET_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
    {
        msgType: 1,
        optionType: ExecutorOptionType.LZ_RECEIVE,
        gas: 100000,
        value: 0,
    },
]

export default async function () {
    // note: pathways declared here are automatically bidirectional
    // if you declare A,B there's no need to declare B,A
    const connections = await generateConnectionsConfig([
        [
            sophonContract, // Chain A contract
            bscContract, // Chain B contract
            [['LayerZero Labs'], [['Stargate', 'Nethermind'], 1]], // [ requiredDVN[], [ optionalDVN[], threshold ] ]
            [20, 20], // [A to B confirmations, B to A confirmations]
            [MAINNET_ENFORCED_OPTIONS, MAINNET_ENFORCED_OPTIONS], // Chain B enforcedOptions, Chain A enforcedOptions
        ],
        [
            sophonContract, // Chain A contract
            baseContract, // Chain B contract
            [['LayerZero Labs'], [['Stargate', 'Nethermind'], 1]], // [ requiredDVN[], [ optionalDVN[], threshold ] ]
            [20, 10], // [A to B confirmations, B to A confirmations]
            [MAINNET_ENFORCED_OPTIONS, MAINNET_ENFORCED_OPTIONS], // Chain B enforcedOptions, Chain A enforcedOptions
        ],
        [
            sophonContract, // Chain A contract
            polygonContract, // Chain B contract
            [['LayerZero Labs'], [['Stargate', 'Nethermind'], 1]], // [ requiredDVN[], [ optionalDVN[], threshold ] ]
            [20, 512], // [A to B confirmations, B to A confirmations]
            [MAINNET_ENFORCED_OPTIONS, MAINNET_ENFORCED_OPTIONS], // Chain B enforcedOptions, Chain A enforcedOptions
        ],
        [
            sophonContract, // Chain A contract
            arbitrumContract, // Chain B contract
            [['LayerZero Labs'], [['Stargate', 'Nethermind'], 1]], // [ requiredDVN[], [ optionalDVN[], threshold ] ]
            [20, 20], // [A to B confirmations, B to A confirmations]
            [MAINNET_ENFORCED_OPTIONS, MAINNET_ENFORCED_OPTIONS], // Chain B enforcedOptions, Chain A enforcedOptions
        ],
        [
            bscContract, // Chain A contract
            baseContract, // Chain B contract
            [['LayerZero Labs'], [['Stargate', 'Nethermind'], 1]], // [ requiredDVN[], [ optionalDVN[], threshold ] ]
            [20, 10], // [A to B confirmations, B to A confirmations]
            [MAINNET_ENFORCED_OPTIONS, MAINNET_ENFORCED_OPTIONS], // Chain B enforcedOptions, Chain A enforcedOptions
        ],
        [
            bscContract, // Chain A contract
            polygonContract, // Chain B contract
            [['LayerZero Labs'], [['Stargate', 'Nethermind'], 1]], // [ requiredDVN[], [ optionalDVN[], threshold ] ]
            [20, 512], // [A to B confirmations, B to A confirmations]
            [MAINNET_ENFORCED_OPTIONS, MAINNET_ENFORCED_OPTIONS], // Chain B enforcedOptions, Chain A enforcedOptions
        ],
        [
            bscContract, // Chain A contract
            arbitrumContract, // Chain B contract
            [['LayerZero Labs'], [['Stargate', 'Nethermind'], 1]], // [ requiredDVN[], [ optionalDVN[], threshold ] ]
            [20, 20], // [A to B confirmations, B to A confirmations]
            [MAINNET_ENFORCED_OPTIONS, MAINNET_ENFORCED_OPTIONS], // Chain B enforcedOptions, Chain A enforcedOptions
        ],
        [
            baseContract, // Chain A contract
            polygonContract, // Chain B contract
            [['LayerZero Labs'], [['Stargate', 'Nethermind'], 1]], // [ requiredDVN[], [ optionalDVN[], threshold ] ]
            [10, 512], // [A to B confirmations, B to A confirmations]
            [MAINNET_ENFORCED_OPTIONS, MAINNET_ENFORCED_OPTIONS], // Chain B enforcedOptions, Chain A enforcedOptions
        ],
        [
            baseContract, // Chain A contract
            arbitrumContract, // Chain B contract
            [['LayerZero Labs'], [['Stargate', 'Nethermind'], 1]], // [ requiredDVN[], [ optionalDVN[], threshold ] ]
            [10, 20], // [A to B confirmations, B to A confirmations]
            [MAINNET_ENFORCED_OPTIONS, MAINNET_ENFORCED_OPTIONS], // Chain B enforcedOptions, Chain A enforcedOptions
        ],
        [
            polygonContract, // Chain A contract
            arbitrumContract, // Chain B contract
            [['LayerZero Labs'], [['Stargate', 'Nethermind'], 1]], // [ requiredDVN[], [ optionalDVN[], threshold ] ]
            [512, 20], // [A to B confirmations, B to A confirmations]
            [MAINNET_ENFORCED_OPTIONS, MAINNET_ENFORCED_OPTIONS], // Chain B enforcedOptions, Chain A enforcedOptions
        ],
    ])
    
    return {
        contracts: [
            { contract: sophonContract },
            { contract: bscContract },
            { contract: baseContract },
            { contract: polygonContract },
            { contract: arbitrumContract },
        ],
        connections,
    }
}
