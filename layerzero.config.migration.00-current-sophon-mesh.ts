import { generateConnectionsConfig } from '@layerzerolabs/metadata-tools'

import {
	currentSophonMeshContracts,
	currentSophonMeshPathways,
} from './layerzero.config.shared'

/**
 * Phase 00: preflight snapshot of the current production mesh.
 *
 * Use for CLI verification before migration:
 *   npx hardhat lz:oapp:peers:get --oapp-config layerzero.config.migration.00-current-sophon-mesh.ts
 */
export default async function () {
	const connections = await generateConnectionsConfig(currentSophonMeshPathways)

	return {
		contracts: currentSophonMeshContracts.map((contract) => ({ contract })),
		connections,
	}
}
