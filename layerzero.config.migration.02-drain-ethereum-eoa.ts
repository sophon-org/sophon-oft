import {
	drainRouteContracts,
	ethereumContract,
	ethereumDrainPathways,
	generateSendOnlyConnectionsFromEids,
} from './layerzero.config.shared'

/**
 * Phase 02: Ethereum EOA-owned send side of the temporary drain route.
 *
 * Run without --safe while the Ethereum adapter remains owned by the EOA. This
 * config sets the Ethereum peer and send-side security settings for the exact
 * Ethereum -> Sophon drain only.
 */
export default async function () {
	const connections = await generateSendOnlyConnectionsFromEids(
		ethereumDrainPathways,
		[ethereumContract.eid],
	)

	return {
		contracts: drainRouteContracts.map((contract) => ({ contract })),
		connections,
	}
}
