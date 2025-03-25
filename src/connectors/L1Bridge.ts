import { parseAbi } from 'viem'
import { prepareWriteContract, writeContract, waitForTransaction } from 'wagmi/actions'
import { sepolia } from 'wagmi/chains'
import {
  L1_TOKEN_ADDRESS,
  L1_BRIDGE_ADDRESS,
  L2_REGISTRY,
  DEFAULT_DEPOSIT_VALUE,
} from '../config/constants'

const tokenAbi = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
])

const depositWithMessageAbi = parseAbi([
  'function depositWithMessage(address token, uint256 amount, uint256 l2Recipient, uint256[] message) external payable',
])

/**
 * 1) Approve bridging contract
 * 2) depositWithMessage bridging
 */
export async function deployBotFromL1(
  userAddress: `0x${string}`,
  amount: bigint,
  tileLocation: bigint
): Promise<`0x${string}`> {
  const approveConfig = await prepareWriteContract({
    address: L1_TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: 'approve',
    args: [L1_BRIDGE_ADDRESS, amount],
    chainId: sepolia.id,
  })
  const { hash: approveTx } = await writeContract(approveConfig)
  await waitForTransaction({ hash: approveTx })

  const depositConfig = await prepareWriteContract({
    address: L1_BRIDGE_ADDRESS,
    abi: depositWithMessageAbi,
    functionName: 'depositWithMessage',
    args: [
      L1_TOKEN_ADDRESS,
      amount,
      BigInt(L2_REGISTRY),
      [BigInt(userAddress), tileLocation],
    ],
    value: DEFAULT_DEPOSIT_VALUE,
    chainId: sepolia.id,
  })
  const { hash: depositTx } = await writeContract(depositConfig)
  await waitForTransaction({ hash: depositTx })

  return depositTx
}
