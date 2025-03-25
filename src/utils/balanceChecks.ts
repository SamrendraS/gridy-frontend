import { readContract } from 'wagmi/actions'
import { parseAbi } from 'viem'
import { sepolia } from 'wagmi/chains'
import { Account, Contract, RpcProvider } from 'starknet'

export async function checkL1Balance(
  userAddress: `0x${string}`,
  tokenAddress: `0x${string}`,
  requiredAmount: bigint
) {
  const erc20Abi = parseAbi([
    'function balanceOf(address) view returns (uint256)',
  ])
  const balance: bigint = await readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userAddress],
    // chainId: sepolia.id,
  })
  if (balance < requiredAmount) {
    throw new Error(`Insufficient L1 token balance. You have ${balance}, need >= ${requiredAmount}.`)
  }
}

export async function checkL2Balance(
  account: Account,
  tokenAddress: string,
  requiredAmount: bigint
) {
  const erc20Abi = [
    {
      "type": "function",
      "name": "balanceOf",
      "inputs": [
        {
          "name": "account",
          "type": "core::starknet::contract_address::ContractAddress"
        }
      ],
      "outputs": [
        {
          "type": "core::integer::u256"
        }
      ],
      "state_mutability": "view"
    }
  ]

  const tokenContract = new Contract(
    erc20Abi,
    tokenAddress,
    new RpcProvider({ nodeUrl: import.meta.env.VITE_STARKNET_RPC_URL })
  )
  const result = await tokenContract.balanceOf(account.address)
  const userBalance = BigInt(result)
  if (userBalance < requiredAmount) {
    throw new Error(`Insufficient L2 token balance. You have ${userBalance}, need >= ${requiredAmount}`)
  }
}
