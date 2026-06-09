import {
	finalEthereumMeshContracts,
	finalEthereumMeshPathways,
	generateConnectionsFromEids,
	satelliteContracts,
} from './layerzero.config.shared'

/**
 * Phase 04: Safe-owned satellite sides of the final mesh.
 *
 * Run with --safe. The Ethereum adapter remains EOA-owned until all final mesh
 * verification passes.
 */
export default async function () {
	const connections = await generateConnectionsFromEids(
		finalEthereumMeshPathways,
		satelliteContracts.map((contract) => contract.eid),
	)

	return {
		contracts: finalEthereumMeshContracts.map((contract) => ({ contract })),
		connections,
	}
}
