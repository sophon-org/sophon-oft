import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'
import {
	generateConnectionsConfig,
	type TwoWayConfig,
} from '@layerzerolabs/metadata-tools'
import type {
	OAppEnforcedOption,
	OmniPointHardhat,
} from '@layerzerolabs/toolbox-hardhat'

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

// Network confirmation constants
const SOPHON_CONFIRMATIONS = 20
const BSC_CONFIRMATIONS = 20
const BASE_CONFIRMATIONS = 10
const POLYGON_CONFIRMATIONS = 512
const ARBITRUM_CONFIRMATIONS = 20
const BEAM_CONFIRMATIONS = 20

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

const beamContract: OmniPointHardhat = {
	eid: EndpointId.MERITCIRCLE_V2_MAINNET,
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

type DvnConfig = TwoWayConfig[2]
type DvnConfigOptional = Exclude<DvnConfig[1], []>

type DvnPolicy = {
	optionalDvns: DvnConfigOptional[0]
	threshold: DvnConfigOptional[1]
}

const REQUIRED_DVNS: DvnConfig[0] = ['LayerZero Labs']

// Sophon paths use 2-of-3.
const SOPHON_DVN_POLICY: DvnPolicy = {
	optionalDvns: ['Canary', 'Horizen', 'Nethermind'],
	threshold: 2,
}
const CROSS_CHAIN_DVN_POLICY: DvnPolicy = {
	optionalDvns: ['Canary', 'Deutsche Telekom', 'P2P', 'Horizen', 'Luganodes'],
	threshold: 3,
}
const BEAM_DVN_POLICY: DvnPolicy = {
	optionalDvns: ['BCW Group', 'Canary', 'Horizen', 'Nethermind'],
	threshold: 3,
}

const dvnConfig = ({ optionalDvns, threshold }: DvnPolicy): DvnConfig => [
	REQUIRED_DVNS,
	[optionalDvns, threshold],
]

export default async function () {
	// note: pathways declared here are automatically bidirectional
	// if you declare A,B there's no need to declare B,A
	const connections = await generateConnectionsConfig([
		[
			sophonContract, // Chain A contract
			bscContract, // Chain B contract
			dvnConfig(SOPHON_DVN_POLICY), // [ requiredDVN[], [ optionalDVN[], threshold ] ]
			[SOPHON_CONFIRMATIONS, BSC_CONFIRMATIONS], // [A to B confirmations, B to A confirmations]
			[MAINNET_ENFORCED_OPTIONS, MAINNET_ENFORCED_OPTIONS], // Chain B enforcedOptions, Chain A enforcedOptions
		],
		[
			sophonContract, // Chain A contract
			baseContract, // Chain B contract
			dvnConfig(SOPHON_DVN_POLICY), // [ requiredDVN[], [ optionalDVN[], threshold ] ]
			[SOPHON_CONFIRMATIONS, BASE_CONFIRMATIONS], // [A to B confirmations, B to A confirmations]
			[MAINNET_ENFORCED_OPTIONS, MAINNET_ENFORCED_OPTIONS], // Chain B enforcedOptions, Chain A enforcedOptions
		],
		[
			sophonContract, // Chain A contract
			polygonContract, // Chain B contract
			dvnConfig(SOPHON_DVN_POLICY), // [ requiredDVN[], [ optionalDVN[], threshold ] ]
			[SOPHON_CONFIRMATIONS, POLYGON_CONFIRMATIONS], // [A to B confirmations, B to A confirmations]
			[MAINNET_ENFORCED_OPTIONS, MAINNET_ENFORCED_OPTIONS], // Chain B enforcedOptions, Chain A enforcedOptions
		],
		[
			sophonContract, // Chain A contract
			arbitrumContract, // Chain B contract
			dvnConfig(SOPHON_DVN_POLICY), // [ requiredDVN[], [ optionalDVN[], threshold ] ]
			[SOPHON_CONFIRMATIONS, ARBITRUM_CONFIRMATIONS], // [A to B confirmations, B to A confirmations]
			[MAINNET_ENFORCED_OPTIONS, MAINNET_ENFORCED_OPTIONS], // Chain B enforcedOptions, Chain A enforcedOptions
		],
		[
			sophonContract, // Chain A contract
			beamContract, // Chain B contract
			// Sophon↔Beam must use the Sophon-compatible set because Sophon does not
			// support the Beam-specific optional DVN set.
			dvnConfig(SOPHON_DVN_POLICY), // [ requiredDVN[], [ optionalDVN[], threshold ] ]
			[SOPHON_CONFIRMATIONS, BEAM_CONFIRMATIONS], // [A to B confirmations, B to A confirmations]
			[MAINNET_ENFORCED_OPTIONS, MAINNET_ENFORCED_OPTIONS], // Chain B enforcedOptions, Chain A enforcedOptions
		],
		[
			bscContract, // Chain A contract
			baseContract, // Chain B contract
			dvnConfig(CROSS_CHAIN_DVN_POLICY), // [ requiredDVN[], [ optionalDVN[], threshold ] ]
			[BSC_CONFIRMATIONS, BASE_CONFIRMATIONS], // [A to B confirmations, B to A confirmations]
			[MAINNET_ENFORCED_OPTIONS, MAINNET_ENFORCED_OPTIONS], // Chain B enforcedOptions, Chain A enforcedOptions
		],
		[
			bscContract, // Chain A contract
			polygonContract, // Chain B contract
			dvnConfig(CROSS_CHAIN_DVN_POLICY), // [ requiredDVN[], [ optionalDVN[], threshold ] ]
			[BSC_CONFIRMATIONS, POLYGON_CONFIRMATIONS], // [A to B confirmations, B to A confirmations]
			[MAINNET_ENFORCED_OPTIONS, MAINNET_ENFORCED_OPTIONS], // Chain B enforcedOptions, Chain A enforcedOptions
		],
		[
			bscContract, // Chain A contract
			arbitrumContract, // Chain B contract
			dvnConfig(CROSS_CHAIN_DVN_POLICY), // [ requiredDVN[], [ optionalDVN[], threshold ] ]
			[BSC_CONFIRMATIONS, ARBITRUM_CONFIRMATIONS], // [A to B confirmations, B to A confirmations]
			[MAINNET_ENFORCED_OPTIONS, MAINNET_ENFORCED_OPTIONS], // Chain B enforcedOptions, Chain A enforcedOptions
		],
		[
			bscContract, // Chain A contract
			beamContract, // Chain B contract
			dvnConfig(BEAM_DVN_POLICY), // [ requiredDVN[], [ optionalDVN[], threshold ] ]
			[BSC_CONFIRMATIONS, BEAM_CONFIRMATIONS], // [A to B confirmations, B to A confirmations]
			[MAINNET_ENFORCED_OPTIONS, MAINNET_ENFORCED_OPTIONS], // Chain B enforcedOptions, Chain A enforcedOptions
		],
		[
			baseContract, // Chain A contract
			polygonContract, // Chain B contract
			dvnConfig(CROSS_CHAIN_DVN_POLICY), // [ requiredDVN[], [ optionalDVN[], threshold ] ]
			[BASE_CONFIRMATIONS, POLYGON_CONFIRMATIONS], // [A to B confirmations, B to A confirmations]
			[MAINNET_ENFORCED_OPTIONS, MAINNET_ENFORCED_OPTIONS], // Chain B enforcedOptions, Chain A enforcedOptions
		],
		[
			baseContract, // Chain A contract
			arbitrumContract, // Chain B contract
			dvnConfig(CROSS_CHAIN_DVN_POLICY), // [ requiredDVN[], [ optionalDVN[], threshold ] ]
			[BASE_CONFIRMATIONS, ARBITRUM_CONFIRMATIONS], // [A to B confirmations, B to A confirmations]
			[MAINNET_ENFORCED_OPTIONS, MAINNET_ENFORCED_OPTIONS], // Chain B enforcedOptions, Chain A enforcedOptions
		],
		[
			baseContract, // Chain A contract
			beamContract, // Chain B contract
			dvnConfig(BEAM_DVN_POLICY), // [ requiredDVN[], [ optionalDVN[], threshold ] ]
			[BASE_CONFIRMATIONS, BEAM_CONFIRMATIONS], // [A to B confirmations, B to A confirmations]
			[MAINNET_ENFORCED_OPTIONS, MAINNET_ENFORCED_OPTIONS], // Chain B enforcedOptions, Chain A enforcedOptions
		],
		[
			polygonContract, // Chain A contract
			arbitrumContract, // Chain B contract
			dvnConfig(CROSS_CHAIN_DVN_POLICY), // [ requiredDVN[], [ optionalDVN[], threshold ] ]
			[POLYGON_CONFIRMATIONS, ARBITRUM_CONFIRMATIONS], // [A to B confirmations, B to A confirmations]
			[MAINNET_ENFORCED_OPTIONS, MAINNET_ENFORCED_OPTIONS], // Chain B enforcedOptions, Chain A enforcedOptions
		],
		[
			polygonContract, // Chain A contract
			beamContract, // Chain B contract
			dvnConfig(BEAM_DVN_POLICY), // [ requiredDVN[], [ optionalDVN[], threshold ] ]
			[POLYGON_CONFIRMATIONS, BEAM_CONFIRMATIONS], // [A to B confirmations, B to A confirmations]
			[MAINNET_ENFORCED_OPTIONS, MAINNET_ENFORCED_OPTIONS], // Chain B enforcedOptions, Chain A enforcedOptions
		],
		[
			arbitrumContract, // Chain A contract
			beamContract, // Chain B contract
			dvnConfig(BEAM_DVN_POLICY), // [ requiredDVN[], [ optionalDVN[], threshold ] ]
			[ARBITRUM_CONFIRMATIONS, BEAM_CONFIRMATIONS], // [A to B confirmations, B to A confirmations]
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
			{ contract: beamContract },
		],
		connections,
	}
}
