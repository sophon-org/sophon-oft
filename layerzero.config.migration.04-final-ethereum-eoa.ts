import {
	ethereumContract,
	finalEthereumMeshContracts,
	finalEthereumMeshPathways,
	generateConnectionsFromEids,
} from './layerzero.config.shared'

/**
 * Phase 04: Ethereum EOA-owned side of the final mesh.
 *
 * Run without --safe while the Ethereum adapter remains owned by the EOA.
 */
export default async function () {
	const connections = await generateConnectionsFromEids(
		finalEthereumMeshPathways,
		[ethereumContract.eid],
	)

	return {
		contracts: finalEthereumMeshContracts.map((contract) => ({ contract })),
		connections,
	}
}
