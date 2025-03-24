import { Account, Contract } from 'starknet';
import {
  L2_BRIDGE_ADDRESS,
  L2_TOKEN_ADDRESS,
  L3_REGISTRY,
} from '../config/constants';

export async function deployBotFromL2(
  account: Account,
  playerAddress: string,
  tileLocation: string
): Promise<string> {
  if (!account) throw new Error("No L2 wallet account provided.");

  const gridTokenAbi = await account.getClassAt(L2_TOKEN_ADDRESS);
  const gridTokenContract = new Contract(gridTokenAbi.abi, L2_TOKEN_ADDRESS, account);
  const approveCall = gridTokenContract.populate('approve', {
    spender: L2_BRIDGE_ADDRESS,
    amount: 11n * 10n ** 18n,
  });

  const bridgeAbi = await account.getClassAt(L2_BRIDGE_ADDRESS);
  const bridgeContract = new Contract(bridgeAbi.abi, L2_BRIDGE_ADDRESS, account);
  const depositCall = bridgeContract.populate('deposit_with_message', {
    token: L2_TOKEN_ADDRESS,
    amount: 11n * 10n ** 18n,
    appchain_recipient: L3_REGISTRY,
    message: [
      playerAddress,
      BigInt(tileLocation),
    ],
  });

  const txResponse = await account.execute([approveCall, depositCall]);
  return txResponse.transaction_hash;
}
