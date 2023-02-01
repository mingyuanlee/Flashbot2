import {
  Wallet, BigNumber, ethers, providers
} from 'ethers'
import {
  FlashbotsBundleProvider,
  FlashbotsBundleResolution
} from '@flashbots/ethers-provider-bundle'
import key from './keys.js'

// Set up the provider for goerli
const provider = new providers.JsonRpcProvider(
  'https://eth-goerli.g.alchemy.com/v2/7s9r-ivrZZy9aJ0vhFkj3rwq9vTuMRDF'
)

// Create flashbot id
const authSigner = new Wallet (
  key,
  provider
)

// Create the flashbot provider
const start = async () => {
  const flashbotsProvider = await FlashbotsBundleProvider.create(
    provider,
    authSigner,
    'https://relay-goerli.flashbots.net'
  )

  // Set up gas fee and etc
  const GWEI = BigNumber.from(10).pow(9)
  // Extra gas for miners
  const LEGACY_GAS_PRICE = GWEI.mul(13)
  const PRIORITY_FEE = GWEI.mul(100)
  const blockNumber = await provider.getBlockNumber()
  const block = await provider.getBlock(blockNumber)
  const maxBaseFeeInFutureBlock = FlashbotsBundleProvider.getMaxBaseFeeInFutureBlock(block.baseFeePerGas, 6)
  const amountInEther = '0.001'

  const signedTransactions = await flashbotsProvider.signBundle([
    {
      signer: authSigner,
      transaction: {
        to: '0x2D82F988CB846Fc243a334dA20Fe81E4DE8B9a83',
        type: 2,
        maxFeePerGas: PRIORITY_FEE.add(maxBaseFeeInFutureBlock),
        maxPriorityFeePerGas: PRIORITY_FEE,
        data: '0x',
        chainId: 5,
        value: ethers.utils.parseEther(amountInEther),
      },
    }
    
  ])

  console.log(new Date())
  console.log('Starting to run the simulation...')
  const simulation = await flashbotsProvider.simulate(
    signedTransactions,
    blockNumber + 1,
  )
  console.log(new Date())
  
  for (let i = 1; i <= 10; i++) {
    const bundleSubmission = await flashbotsProvider.sendRawBundle(
      signedTransactions,
      blockNumber + i
    )
    console.log('bundle submitter, waiting', bundleSubmission.bundleHash)
    const waitResponse = await bundleSubmission.wait()
    console.log(`Wait Response: ${FlashbotsBundleResolution[waitResponse]}`)
    if (
      waitResponse === FlashbotsBundleResolution.BundleIncluded
    ) {
      console.log('Bundle included!')
      process.exit(0)
    } else {
      console.log({
        bundleStats: await flashbotsProvider.getBundleStats(
          simulation.bundleHash,
          blockNumber + i
        ),
        userStats: await flashbotsProvider.getUserStats()
      })
    }
  }

}

start()