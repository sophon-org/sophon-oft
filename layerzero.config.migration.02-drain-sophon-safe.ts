import {
	drainRouteContracts,
	ethereumDrainPathways,
	generateReceiveOnlyConnectionsFromEids,
	legacySophonContract,
} from './layerzero.config.shared'

/**
 * Phase 02: Sophon Safe-owned receive side of the temporary drain route.
 *
 * Run with --safe. This config sets the Sophon peer and receive-side security
 * settings required to accept Ethereum -> Sophon drain messages, but it does
 * not configure Sophon send-side settings back to Ethereum.
 */
export default async function () {
	const connections = await generateReceiveOnlyConnectionsFromEids(
		ethereumDrainPathways,
		[legacySophonContract.eid],
	)

	return {
		contracts: drainRouteContracts.map((contract) => ({ contract })),
		connections,
	}
}
