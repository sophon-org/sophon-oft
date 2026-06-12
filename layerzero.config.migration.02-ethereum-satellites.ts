import { generateConnectionsConfig } from '@layerzerolabs/metadata-tools'

import {
	finalEthereumMeshContracts,
	finalEthereumSatellitePathways,
} from './layerzero.config.shared'

/**
 * Batch 2 LayerZero CLI config: final Ethereum <-> satellite wiring only.
 *
 * Satellite <-> satellite pathways are intentionally excluded because they are
 * already live and must not be unlinked or relinked during this migration.
 */
export default async function () {
	const connections = await generateConnectionsConfig(
		finalEthereumSatellitePathways,
	)

	return {
		contracts: finalEthereumMeshContracts.map((contract) => ({ contract })),
		connections,
	}
}
