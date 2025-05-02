import { Wallet } from 'ethers'
import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
  ERC1967Proxy__factory,
  WalletContract,
  WalletContractFactory__factory,
  WalletContract__factory,
  TestUtil,
  TestUtil__factory
} from '../../typechain'
import {
  createAccount,
  createAddress,
  createAccountOwner,
  getBalance,
  isDeployed,
  ONE_ETH,
  HashZero, deployEntryPoint
} from './testutils'
import { fillUserOpDefaults, getUserOpHash, encodeUserOp, signUserOpWithZkProof, packUserOp } from './UserOp'
import { parseEther } from 'ethers/lib/utils'
import { UserOperation } from './UserOperation'
const fs = require('fs');

describe('test WalletContract', function () {
  this.timeout(120000);
  let entryPoint: string
  let accounts: string[]
  let testUtil: TestUtil
  let accountOwner: Wallet
  const ethersSigner = ethers.provider.getSigner()

  before(async function () {
    entryPoint = await deployEntryPoint().then(e => e.address)
    accounts = await ethers.provider.listAccounts()
    // ignore in geth.. this is just a sanity test. should be refactored to use a single-account mode..
    if (accounts.length < 2) this.skip()
    testUtil = await new TestUtil__factory(ethersSigner).deploy()
    accountOwner = createAccountOwner()
  })

  it('owner should be able to call transfer', async () => {
    const { proxy: account } = await createAccount(ethers.provider.getSigner(), accounts[0], entryPoint)
    await ethersSigner.sendTransaction({ from: accounts[0], to: account.address, value: parseEther('2') })
    await account.execute(accounts[2], ONE_ETH, '0x')
  })
  it('other account should not be able to call transfer', async () => {
    const { proxy: account } = await createAccount(ethers.provider.getSigner(), accounts[0], entryPoint)
    await expect(account.connect(ethers.provider.getSigner(1)).execute(accounts[2], ONE_ETH, '0x'))
      .to.be.revertedWith('account: not Owner or EntryPoint')
  })

  it('should pack in js the same as solidity', async () => {
    const op = await fillUserOpDefaults({ sender: accounts[0] })
    const encoded = encodeUserOp(op)
    const packed = packUserOp(op)
    expect(await testUtil.encodeUserOp(packed)).to.equal(encoded)
  })

  describe('#validateUserOp', () => {
    let account: WalletContract
    let userOp: UserOperation
    let userOpHash: string
    let preBalance: number
    let expectedPay: number

    const actualGasPrice = 1e9
    // for testing directly validateUserOp, we initialize the account with EOA as entryPoint.
    let entryPointEoa: string

    before(async () => {
      entryPointEoa = accounts[2]
      const epAsSigner = await ethers.getSigner(entryPointEoa)
      // console.log('epAsSigner:', epAsSigner.address)
      // cant use "WalletContractFactory", since it attempts to increment nonce first
      const implementation = await new WalletContract__factory(ethersSigner).deploy(entryPointEoa)
      // console.log('implementation:', implementation.address)
      const proxy = await new ERC1967Proxy__factory(ethersSigner).deploy(implementation.address, '0x')
      account = WalletContract__factory.connect(proxy.address, epAsSigner)
      // console.log('account:', account.address)
      await ethersSigner.sendTransaction({ from: accounts[0], to: account.address, value: parseEther('0.2') })
      const callGasLimit = 200000
      const verificationGasLimit = 1000000
      const maxFeePerGas = 3e9
      const chainId = await ethers.provider.getNetwork().then(net => net.chainId)
      
      // Read ZK proof data from proof.json file
      const proofData = JSON.parse(fs.readFileSync('test/zklogin/proof.json', 'utf8'));
      // Read public signals from public.json file
      const publicData = JSON.parse(fs.readFileSync('test/zklogin/public.json', 'utf8'));
      
      const zkProof = {
        pA: proofData.pi_a.slice(0, 2).map(BigInt),
        pB: [
          [BigInt(proofData.pi_b[0][1]), BigInt(proofData.pi_b[0][0])],
          [BigInt(proofData.pi_b[1][1]), BigInt(proofData.pi_b[1][0])]
        ],
        pC: proofData.pi_c.slice(0, 2).map(BigInt),
        pubSignals: publicData.map(BigInt)
      };
      // console.log('ZK Proof loaded:', JSON.stringify(zkProof, (_, v) => typeof v === 'bigint' ? v.toString() : v));
      userOp = signUserOpWithZkProof(fillUserOpDefaults({
        sender: account.address,
        callGasLimit,
        verificationGasLimit,
        maxFeePerGas
      }), accountOwner, entryPointEoa, chainId, zkProof)

      userOpHash = await getUserOpHash(userOp, entryPointEoa, chainId)

      expectedPay = actualGasPrice * (callGasLimit + verificationGasLimit)

      preBalance = await getBalance(account.address)
      const packedOp = packUserOp(userOp)
      const ret = await account.validateUserOp(packedOp, userOpHash, expectedPay, { gasPrice: actualGasPrice })
      await ret.wait()
    })

    it('should pay', async () => {
      const postBalance = await getBalance(account.address)
      expect(preBalance - postBalance).to.eql(expectedPay)
    })

    it('should return NO_SIG_VALIDATION on wrong signature', async () => {
      const userOpHash = HashZero
      const packedOp = packUserOp(userOp)
      const deadline = await account.callStatic.validateUserOp({ ...packedOp, nonce: 1 }, userOpHash, 0)
      expect(deadline).to.eq(1)
    })
  })

  context('WalletContractFactory', () => {
    it('sanity: check deployer', async () => {
      const proofData = JSON.parse(fs.readFileSync('test/zklogin/public.json', 'utf8'));
      const salt = proofData[1]; // Reading salt from index 1 of proof.json array
      // console.log('Salt value from proof.json:', salt);

      const ownerAddr = createAddress()
      const deployer = await new WalletContractFactory__factory(ethersSigner).deploy(entryPoint)
      const target = await deployer.callStatic.createAccount(ownerAddr, salt)
      // console.log('Target address:', target)
      expect(await isDeployed(target)).to.eq(false)
      await deployer.createAccount(ownerAddr, salt)
      expect(await isDeployed(target)).to.eq(true)
    })
  })
})
