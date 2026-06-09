import { Options } from '@layerzerolabs/lz-v2-utilities'
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { type Contract, ContractFactory } from 'ethers'
import { deployments, ethers } from 'hardhat'

describe('SophonTokenOFTAdapter Test', () => {
	const eidA = 1
	const eidB = 2

	let adapterFactory: ContractFactory
	let oftFactory: ContractFactory
	let erc20Factory: ContractFactory
	let endpointFactory: ContractFactory
	let ownerA: SignerWithAddress
	let ownerB: SignerWithAddress
	let endpointOwner: SignerWithAddress
	let token: Contract
	let oftAdapter: Contract
	let oftB: Contract
	let mockEndpointV2A: Contract
	let mockEndpointV2B: Contract

	before(async () => {
		adapterFactory = await ethers.getContractFactory('MyOFTAdapterMock')
		oftFactory = await ethers.getContractFactory('MyOFTMock')
		erc20Factory = await ethers.getContractFactory('MyERC20Mock')

		;[ownerA, ownerB, endpointOwner] = await ethers.getSigners()

		const endpointArtifact = await deployments.getArtifact('EndpointV2Mock')
		endpointFactory = new ContractFactory(
			endpointArtifact.abi,
			endpointArtifact.bytecode,
			endpointOwner,
		)
	})

	beforeEach(async () => {
		mockEndpointV2A = await endpointFactory.deploy(eidA)
		mockEndpointV2B = await endpointFactory.deploy(eidB)

		token = await erc20Factory.deploy('Token', 'TOKEN')

		oftAdapter = await adapterFactory.deploy(
			token.address,
			mockEndpointV2A.address,
			ownerA.address,
		)
		oftB = await oftFactory.deploy(
			'bOFT',
			'bOFT',
			mockEndpointV2B.address,
			ownerB.address,
		)

		await mockEndpointV2A.setDestLzEndpoint(
			oftB.address,
			mockEndpointV2B.address,
		)
		await mockEndpointV2B.setDestLzEndpoint(
			oftAdapter.address,
			mockEndpointV2A.address,
		)

		await oftAdapter
			.connect(ownerA)
			.setPeer(eidB, ethers.utils.hexZeroPad(oftB.address, 32))
		await oftB
			.connect(ownerB)
			.setPeer(eidA, ethers.utils.hexZeroPad(oftAdapter.address, 32))
	})

	it('locks ERC20 collateral and mints OFT on the destination', async () => {
		const initialAmount = ethers.utils.parseEther('100')
		const tokensToSend = ethers.utils.parseEther('1')

		await token.mint(ownerA.address, initialAmount)

		const options = Options.newOptions()
			.addExecutorLzReceiveOption(200000, 0)
			.toHex()
			.toString()

		const sendParam = [
			eidB,
			ethers.utils.hexZeroPad(ownerB.address, 32),
			tokensToSend,
			tokensToSend,
			options,
			'0x',
			'0x',
		]

		const [nativeFee] = await oftAdapter.quoteSend(sendParam, false)

		await token.connect(ownerA).approve(oftAdapter.address, tokensToSend)
		await oftAdapter
			.connect(ownerA)
			.send(sendParam, [nativeFee, 0], ownerA.address, {
				value: nativeFee,
			})

		const finalBalanceA = await token.balanceOf(ownerA.address)
		const finalBalanceAdapter = await token.balanceOf(oftAdapter.address)
		const finalBalanceB = await oftB.balanceOf(ownerB.address)

		expect(finalBalanceA.eq(initialAmount.sub(tokensToSend))).to.equal(true)
		expect(finalBalanceAdapter.eq(tokensToSend)).to.equal(true)
		expect(finalBalanceB.eq(tokensToSend)).to.equal(true)
	})
})
