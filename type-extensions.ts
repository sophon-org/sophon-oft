import 'hardhat/types/config'

interface OftAdapterConfig {
	tokenAddress: string
}

interface SafeConfig {
	safeUrl: string
	safeAddress: string
	safeApiKey?: string
}

declare module 'hardhat/types/config' {
	interface HardhatNetworkUserConfig {
		oftAdapter?: never
		safeConfig?: never
	}

	interface HardhatNetworkConfig {
		oftAdapter?: never
		safeConfig?: never
	}

	interface HttpNetworkUserConfig {
		oftAdapter?: OftAdapterConfig
		safeConfig?: SafeConfig
	}

	interface HttpNetworkConfig {
		oftAdapter?: OftAdapterConfig
		safeConfig?: SafeConfig
	}
}
