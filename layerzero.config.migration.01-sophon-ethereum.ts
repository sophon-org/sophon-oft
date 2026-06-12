import { generateConnectionsConfig } from '@layerzerolabs/metadata-tools'

import {
	ethereumContract,
	legacySophonContract,
	sophonToEthereumMigrationPathways,
} from './layerzero.config.shared'

/**
 * Batch 1 LayerZero CLI config: temporary Sophon <-> Ethereum wiring.
 *
 * Zero-peer removals for Sophon <-> satellite pathways are explicit calldata
 * because the LayerZero CLI wires declared pathways and does not emit removals
 * for omitted routes.
 */
export default async function () {
	const connections = await generateConnectionsConfig(
		sophonToEthereumMigrationPathways,
	)

	return {
		contracts: [legacySophonContract, ethereumContract].map((contract) => ({
			contract,
		})),
		connections,
	}
}
