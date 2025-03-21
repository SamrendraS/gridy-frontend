import { Account, Contract } from 'starknet';
import {
  L2_BRIDGE_ADDRESS,
  L2_TOKEN_ADDRESS,
  L3_REGISTRY,
  // If you have a separate L2 bridging contract address, import
  // or define it here. E.g. "TokenBridge_starknet_bridge"
  // For example:
  // L2_BRIDGE_ADDRESS = "0x00422dd5fe0..."
} from '../config/constants';

/**
 * depositWithMessage from L2 to L3. 
 * 1) Approve the L2 bridging contract
 * 2) deposit_with_message with the tile location
 *
 * @param account The starknet.js account
 * @param playerAddress The user’s L2 address
 * @param tileLocation e.g. '85' or '185'
 */
export async function deployBotFromL2(
  account: Account,
  playerAddress: string,
  tileLocation: string
): Promise<string> {
  if (!account) throw new Error("No L2 wallet account provided.");

  // For example, if your L2 bridging contract is "TokenBridge_starknet_bridge

  // 1) Approve
  const gridTokenAbi = await account.getClassAt(L2_TOKEN_ADDRESS);
  const gridTokenContract = new Contract(gridTokenAbi.abi, L2_TOKEN_ADDRESS, account);
  const approveCall = gridTokenContract.populate('approve', {
    spender: L2_BRIDGE_ADDRESS,
    amount: 11n * 10n ** 18n, // or however many tokens you need
  });

  // Execute the approval
  // await account.execute(approveCall);

  // 2) deposit_with_message
  const bridgeAbi = await account.getClassAt(L2_BRIDGE_ADDRESS);
  const bridgeContract = new Contract(bridgeAbi.abi, L2_BRIDGE_ADDRESS, account);
  const depositCall = bridgeContract.populate('deposit_with_message', {
    token: L2_TOKEN_ADDRESS,
    amount: 11n * 10n ** 18n,
    appchain_recipient: L3_REGISTRY,
    message: [
      playerAddress,           // Typically the address that will be recognized on L3
      BigInt(tileLocation),    // location or index
    ],
  });

  const txResponse = await account.execute([approveCall, depositCall]);
  // Usually returns { transaction_hash: "0x..." }
  return txResponse.transaction_hash;
}
