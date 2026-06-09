import assert from 'node:assert'

import type { DeployFunction } from 'hardhat-deploy/types'

const contractName = 'SophonTokenOFTAdapter'

const deploy: DeployFunction = async (hre) => {
	const { getNamedAccounts, deployments } = hre

	const { deploy } = deployments
	const { deployer } = await getNamedAccounts()
	const oftAdapter = hre.network.config.oftAdapter

	assert(deployer, 'Missing named deployer account')

	console.log(`Network: ${hre.network.name}`)
	console.log(`Deployer: ${deployer}`)

	if (oftAdapter == null) {
		console.warn(
			'No oftAdapter configuration found, skipping OFTAdapter deployment',
		)
		return
	}

	assert(oftAdapter.tokenAddress, 'Missing oftAdapter.tokenAddress')

	const endpointV2Deployment = await hre.deployments.get('EndpointV2')

	const { address } = await deploy(contractName, {
		from: deployer,
		args: [oftAdapter.tokenAddress, endpointV2Deployment.address, deployer],
		log: true,
		skipIfAlreadyDeployed: true,
	})

	console.log(
		`Deployed contract: ${contractName}, network: ${hre.network.name}, address: ${address}`,
	)
}

deploy.tags = [contractName]

export default deploy
