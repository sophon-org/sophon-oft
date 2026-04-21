// Get the environment configuration from .env file
//
// To make use of automatic environment setup:
// - Duplicate .env.example file and name it .env
// - Fill in the environment variables
import 'dotenv/config'

import 'hardhat-contract-sizer'
import 'hardhat-deploy'

import '@layerzerolabs/toolbox-hardhat'
import '@nomicfoundation/hardhat-verify'
import '@nomiclabs/hardhat-ethers'

import { EndpointId } from '@layerzerolabs/lz-definitions'
import type {
	HardhatUserConfig,
	HttpNetworkAccountsUserConfig,
} from 'hardhat/types'

import './type-extensions'

// Set your preferred authentication method
//
// If you prefer using a mnemonic, set a MNEMONIC environment variable
// to a valid mnemonic
const MNEMONIC = process.env.MNEMONIC

// If you prefer to be authenticated using a private key, set a PRIVATE_KEY environment variable
const PRIVATE_KEY = process.env.PRIVATE_KEY

const accounts: HttpNetworkAccountsUserConfig | undefined = MNEMONIC
	? { mnemonic: MNEMONIC }
	: PRIVATE_KEY
		? [PRIVATE_KEY]
		: undefined

if (accounts == null) {
	console.warn(
		'Could not find MNEMONIC or PRIVATE_KEY environment variables. It will not be possible to execute transactions in your example.',
	)
}

const config: HardhatUserConfig = {
	paths: {
		cache: 'cache/hardhat',
	},
	solidity: {
		compilers: [
			{
				version: '0.8.28',
				settings: {
					optimizer: {
						enabled: true,
						runs: 200,
					},
				},
			},
		],
	},
	networks: {
		base: {
			eid: EndpointId.BASE_V2_MAINNET,
			url: process.env.RPC_URL_BASE || 'https://mainnet.base.org',
			accounts,
		},
		polygon: {
			eid: EndpointId.POLYGON_V2_MAINNET,
			url: process.env.RPC_URL_POLYGON || 'https://polygon.drpc.org',
			accounts,
		},
		arbitrum: {
			eid: EndpointId.ARBITRUM_V2_MAINNET,
			url: process.env.RPC_URL_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
			accounts,
		},
		bsc: {
			eid: EndpointId.BSC_V2_MAINNET,
			url: process.env.RPC_URL_BSC || 'https://bsc.drpc.org',
			accounts,
		},
		sophon: {
			eid: EndpointId.SOPHON_V2_MAINNET,
			url: process.env.RPC_URL_SOPHON || 'https://rpc.sophon.xyz',
			oftAdapter: {
				tokenAddress: '0x70ff61C1436d19090321A312b1f4be89D62ac55C',
			},
			accounts,
		},
		beam: {
			eid: EndpointId.MERITCIRCLE_V2_MAINNET,
			url: process.env.RPC_URL_BEAM || 'https://build.onbeam.com/rpc',
			accounts,
		},
		// 'sepolia-testnet': {
		//     eid: EndpointId.SEPOLIA_V2_TESTNET,
		//     url: process.env.RPC_URL_SEPOLIA || 'https://rpc.sepolia.org/',
		//     accounts,
		//     oftAdapter: {
		//         tokenAddress: '0x0', // Set the token address for the OFT adapter
		//     },
		// },
		// 'avalanche-testnet': {
		//     eid: EndpointId.AVALANCHE_V2_TESTNET,
		//     url: process.env.RPC_URL_FUJI || 'https://rpc.ankr.com/avalanche_fuji',
		//     accounts,
		// },
		// 'amoy-testnet': {
		//     eid: EndpointId.AMOY_V2_TESTNET,
		//     url: process.env.RPC_URL_AMOY || 'https://polygon-amoy-bor-rpc.publicnode.com',
		//     accounts,
		// },
		hardhat: {
			// Need this for testing because TestHelperOz5.sol is exceeding the compiled contract size limit
			allowUnlimitedContractSize: true,
		},
	},
	namedAccounts: {
		deployer: {
			default: 0, // wallet address of index[0], of the mnemonic in .env
		},
	},
	etherscan: {
		apiKey: {
			beam: 'beam', // apiKey is not required, just set a placeholder
		},
		customChains: [
			{
				network: 'beam',
				chainId: 4337,
				urls: {
					apiURL:
						'https://api.routescan.io/v2/network/mainnet/evm/4337/etherscan',
					browserURL: 'https://4337.routescan.io',
				},
			},
		],
	},
	sourcify: {
		enabled: true,
	},
}

export default config
