import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'
import {
	generateConnectionsConfig,
	type TwoWayConfig,
} from '@layerzerolabs/metadata-tools'
import type {
	OAppEdgeConfig,
	OAppEnforcedOption,
	OmniEdgeHardhat,
	OmniPointHardhat,
} from '@layerzerolabs/toolbox-hardhat'

export const ETHEREUM_CONFIRMATIONS = 15
export const SOPHON_CONFIRMATIONS = 20
export const BSC_CONFIRMATIONS = 20
export const BASE_CONFIRMATIONS = 10
export const POLYGON_CONFIRMATIONS = 512
export const ARBITRUM_CONFIRMATIONS = 20
export const BEAM_CONFIRMATIONS = 20

export const ethereumContract: OmniPointHardhat = {
	eid: EndpointId.ETHEREUM_V2_MAINNET,
	contractName: 'SophonTokenOFTAdapter',
}

export const legacySophonContract: OmniPointHardhat = {
	eid: EndpointId.SOPHON_V2_MAINNET,
	contractName: 'SophonTokenOFTAdapter',
}

export const bscContract: OmniPointHardhat = {
	eid: EndpointId.BSC_V2_MAINNET,
	contractName: 'SophonTokenOFT',
}

export const baseContract: OmniPointHardhat = {
	eid: EndpointId.BASE_V2_MAINNET,
	contractName: 'SophonTokenOFT',
}

export const polygonContract: OmniPointHardhat = {
	eid: EndpointId.POLYGON_V2_MAINNET,
	contractName: 'SophonTokenOFT',
}

export const arbitrumContract: OmniPointHardhat = {
	eid: EndpointId.ARBITRUM_V2_MAINNET,
	contractName: 'SophonTokenOFT',
}

export const beamContract: OmniPointHardhat = {
	eid: EndpointId.MERITCIRCLE_V2_MAINNET,
	contractName: 'SophonTokenOFT',
}

export const satelliteContracts = [
	bscContract,
	baseContract,
	polygonContract,
	arbitrumContract,
	beamContract,
]

export const currentSophonMeshContracts = [
	legacySophonContract,
	...satelliteContracts,
]

export const finalEthereumMeshContracts = [
	ethereumContract,
	...satelliteContracts,
]

export const drainRouteContracts = [ethereumContract, legacySophonContract]

export const MAINNET_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
	{
		msgType: 1,
		optionType: ExecutorOptionType.LZ_RECEIVE,
		gas: 100000,
		value: 0,
	},
]

type DvnConfig = TwoWayConfig[2]

// Shared by every pathway: 2 required DVNs plus 1-of-2 optional DVN quorum.
export const dvnConfig: DvnConfig = [
	['LayerZero Labs', 'Canary'],
	[['Nethermind', 'Horizen'], 1],
]

const enforcedOptionsPair: TwoWayConfig[4] = [
	MAINNET_ENFORCED_OPTIONS,
	MAINNET_ENFORCED_OPTIONS,
]

export const currentSophonMeshPathways: TwoWayConfig[] = [
	[
		legacySophonContract,
		bscContract,
		dvnConfig,
		[SOPHON_CONFIRMATIONS, BSC_CONFIRMATIONS],
		enforcedOptionsPair,
	],
	[
		legacySophonContract,
		baseContract,
		dvnConfig,
		[SOPHON_CONFIRMATIONS, BASE_CONFIRMATIONS],
		enforcedOptionsPair,
	],
	[
		legacySophonContract,
		polygonContract,
		dvnConfig,
		[SOPHON_CONFIRMATIONS, POLYGON_CONFIRMATIONS],
		enforcedOptionsPair,
	],
	[
		legacySophonContract,
		arbitrumContract,
		dvnConfig,
		[SOPHON_CONFIRMATIONS, ARBITRUM_CONFIRMATIONS],
		enforcedOptionsPair,
	],
	[
		legacySophonContract,
		beamContract,
		dvnConfig,
		[SOPHON_CONFIRMATIONS, BEAM_CONFIRMATIONS],
		enforcedOptionsPair,
	],
	[
		bscContract,
		baseContract,
		dvnConfig,
		[BSC_CONFIRMATIONS, BASE_CONFIRMATIONS],
		enforcedOptionsPair,
	],
	[
		bscContract,
		polygonContract,
		dvnConfig,
		[BSC_CONFIRMATIONS, POLYGON_CONFIRMATIONS],
		enforcedOptionsPair,
	],
	[
		bscContract,
		arbitrumContract,
		dvnConfig,
		[BSC_CONFIRMATIONS, ARBITRUM_CONFIRMATIONS],
		enforcedOptionsPair,
	],
	[
		bscContract,
		beamContract,
		dvnConfig,
		[BSC_CONFIRMATIONS, BEAM_CONFIRMATIONS],
		enforcedOptionsPair,
	],
	[
		baseContract,
		polygonContract,
		dvnConfig,
		[BASE_CONFIRMATIONS, POLYGON_CONFIRMATIONS],
		enforcedOptionsPair,
	],
	[
		baseContract,
		arbitrumContract,
		dvnConfig,
		[BASE_CONFIRMATIONS, ARBITRUM_CONFIRMATIONS],
		enforcedOptionsPair,
	],
	[
		baseContract,
		beamContract,
		dvnConfig,
		[BASE_CONFIRMATIONS, BEAM_CONFIRMATIONS],
		enforcedOptionsPair,
	],
	[
		polygonContract,
		arbitrumContract,
		dvnConfig,
		[POLYGON_CONFIRMATIONS, ARBITRUM_CONFIRMATIONS],
		enforcedOptionsPair,
	],
	[
		polygonContract,
		beamContract,
		dvnConfig,
		[POLYGON_CONFIRMATIONS, BEAM_CONFIRMATIONS],
		enforcedOptionsPair,
	],
	[
		arbitrumContract,
		beamContract,
		dvnConfig,
		[ARBITRUM_CONFIRMATIONS, BEAM_CONFIRMATIONS],
		enforcedOptionsPair,
	],
]

export const ethereumDrainPathways: TwoWayConfig[] = [
	[
		ethereumContract,
		legacySophonContract,
		dvnConfig,
		[ETHEREUM_CONFIRMATIONS, undefined],
		[MAINNET_ENFORCED_OPTIONS, undefined],
	],
]

export const finalEthereumMeshPathways: TwoWayConfig[] = [
	[
		ethereumContract,
		bscContract,
		dvnConfig,
		[ETHEREUM_CONFIRMATIONS, BSC_CONFIRMATIONS],
		enforcedOptionsPair,
	],
	[
		ethereumContract,
		baseContract,
		dvnConfig,
		[ETHEREUM_CONFIRMATIONS, BASE_CONFIRMATIONS],
		enforcedOptionsPair,
	],
	[
		ethereumContract,
		polygonContract,
		dvnConfig,
		[ETHEREUM_CONFIRMATIONS, POLYGON_CONFIRMATIONS],
		enforcedOptionsPair,
	],
	[
		ethereumContract,
		arbitrumContract,
		dvnConfig,
		[ETHEREUM_CONFIRMATIONS, ARBITRUM_CONFIRMATIONS],
		enforcedOptionsPair,
	],
	[
		ethereumContract,
		beamContract,
		dvnConfig,
		[ETHEREUM_CONFIRMATIONS, BEAM_CONFIRMATIONS],
		enforcedOptionsPair,
	],
	...currentSophonMeshPathways.slice(5),
]

export async function generateConnectionsFromEids(
	pathways: TwoWayConfig[],
	fromEids: number[],
) {
	const connections = await generateConnectionsConfig(pathways)
	const allowed = new Set(fromEids)

	return connections.filter((connection) => allowed.has(connection.from.eid))
}

export async function generateReceiveOnlyConnectionsFromEids(
	pathways: TwoWayConfig[],
	fromEids: number[],
) {
	const connections = (await generateConnectionsFromEids(
		pathways,
		fromEids,
	)) as OmniEdgeHardhat<OAppEdgeConfig | undefined>[]

	return connections.map((connection) => {
		if (connection.config == null) {
			return connection
		}

		const receiveOnlyConfig = { ...connection.config }
		delete receiveOnlyConfig.enforcedOptions
		delete receiveOnlyConfig.sendConfig
		delete receiveOnlyConfig.sendLibrary

		return {
			...connection,
			config: receiveOnlyConfig,
		}
	})
}

export async function generateSendOnlyConnectionsFromEids(
	pathways: TwoWayConfig[],
	fromEids: number[],
) {
	const connections = (await generateConnectionsFromEids(
		pathways,
		fromEids,
	)) as OmniEdgeHardhat<OAppEdgeConfig | undefined>[]

	return connections.map((connection) => {
		if (connection.config == null) {
			return connection
		}

		const sendOnlyConfig = { ...connection.config }
		delete sendOnlyConfig.receiveConfig
		delete sendOnlyConfig.receiveLibraryConfig
		delete sendOnlyConfig.receiveLibraryTimeoutConfig

		return {
			...connection,
			config: sendOnlyConfig,
		}
	})
}
