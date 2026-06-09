import { generateConnectionsConfig } from '@layerzerolabs/metadata-tools'

import {
	finalEthereumMeshContracts,
	finalEthereumMeshPathways,
} from './layerzero.config.shared'

/**
 * Canonical post-migration LayerZero config.
 *
 * Ethereum is the only OFTAdapter hub. The legacy Sophon NativeOFTAdapter is
 * intentionally excluded.
 */
export default async function () {
	const connections = await generateConnectionsConfig(finalEthereumMeshPathways)

	return {
		contracts: finalEthereumMeshContracts.map((contract) => ({ contract })),
		connections,
	}
}
