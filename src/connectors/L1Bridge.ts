import { parseAbi } from 'viem';
import { prepareWriteContract, writeContract } from 'wagmi/actions';
import { sepolia } from 'wagmi/chains';

const L1_TOKEN_ADDRESS = import.meta.env.VITE_L1_TOKEN_ADDRESS as `0x${string}`;
const L1_BRIDGE_ADDRESS = import.meta.env.VITE_L1_BRIDGE_ADDRESS as `0x${string}`;
const L2_REGISTRY = import.meta.env.VITE_L2_REGISTRY as string;
const DEFAULT_DEPOSIT_AMOUNT = BigInt(import.meta.env.VITE_DEFAULT_DEPOSIT_AMOUNT || '1000000000000000');
const DEFAULT_DEPOSIT_VALUE = BigInt(import.meta.env.VITE_DEPOSIT_VALUE || '10000000000000000');

const tokenAbi = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
]);

const depositAbi = parseAbi([
  'function deposit(address token, uint256 amount, uint256 l2Recipient) external payable',
]);

const depositWithMessageAbi = parseAbi([
  'function depositWithMessage(address token, uint256 amount, uint256 l2Recipient, uint256[] message) external payable',
]);

/**
 * Approves the L1 bridging contract to spend user's ERC20 tokens.
 */
export async function approveBridge(amount: bigint = DEFAULT_DEPOSIT_AMOUNT) {
  const config = await prepareWriteContract({
    address: L1_TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: 'approve',
    args: [L1_BRIDGE_ADDRESS, amount],
    chainId: sepolia.id,
  });
  const { hash } = await writeContract(config);
  return hash;
}

/**
 * Calls deposit on the L1 bridging contract (no message).
 * 
 * @param amount  How many tokens to deposit.
 */
export async function depositTokens(
  amount: bigint = DEFAULT_DEPOSIT_AMOUNT,
) {
  // Build the parameters and call deposit(...)
  const config = await prepareWriteContract({
    address: L1_BRIDGE_ADDRESS,
    abi: depositAbi,
    functionName: 'deposit',
    args: [
      L1_TOKEN_ADDRESS,     // address token
      amount,               // uint256 amount
      BigInt("0x0463A5a7D814c754E6C3c10f9De8024B2bdF20eb56aD5168076636A858402D7e"),  // uint256 L2 Address
    ],
    value: DEFAULT_DEPOSIT_VALUE,
    chainId: sepolia.id,
  });

  // Execute the transaction
  const { hash } = await writeContract(config);
  return hash;
}

/**
 * Calls depositWithMessage on the L1 bridging contract.
 * 
 * @param playerL1Address The user’s connected L1 address (e.g. “0xB9A2248C...”).
 * @param amount          How many tokens to deposit.
 * @param tileLocation    Additional data for bridging; e.g. tile index.
 */
export async function depositTokensWithMessage(
  playerL1Address: `0x${string}`, 
  amount: bigint = DEFAULT_DEPOSIT_AMOUNT,
  tileLocation: bigint = 1n,
) {
  const bigIntAddress = BigInt(playerL1Address);
  const message = [bigIntAddress, tileLocation];

  const config = await prepareWriteContract({
    address: L1_BRIDGE_ADDRESS,
    abi: depositWithMessageAbi,
    functionName: 'depositWithMessage',
    args: [
      L1_TOKEN_ADDRESS,
      amount,
      BigInt(L2_REGISTRY),
      message,
    ],
    value: DEFAULT_DEPOSIT_VALUE,
    chainId: sepolia.id,
  });

  const { hash } = await writeContract(config);
  return hash;
}
