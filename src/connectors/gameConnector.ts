// File: ./src/connectors/gameConnector.ts

import { Contract, RpcProvider } from "starknet";

// Minimal ABI containing just what we need
const GameABI = [
  {
    type: "function",
    name: "get_total_bots_of_player",
    inputs: [
      {
        name: "player",
        type: "core::starknet::contract_address::ContractAddress",
      },
    ],
    outputs: [
      {
        type: "core::felt252",
      },
    ],
    state_mutability: "view",
  },
  {
    type: "function",
    name: "get_bot_of_player",
    inputs: [
      {
        name: "player",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        name: "index",
        type: "core::felt252",
      },
    ],
    outputs: [
      {
        type: "core::starknet::contract_address::ContractAddress",
      },
    ],
    state_mutability: "view",
  },
];

/**
 * fetchPlayerBots:
 * 1) get_total_bots_of_player(player)
 * 2) for each index [0..totalBots-1], call get_bot_of_player(player, index)
 * 3) convert returned addresses to "0x" hex strings
 * 4) return an array of these addresses
 *
 * @param gameAddress The address of your Game contract on L3
 * @param player      The player's address (hex string). We treat it as "0x..."
 * @returns string[] array of bot addresses in hex
 */
export async function fetchPlayerBots(
  gameAddress: string,
  player: string
): Promise<string[]> {
  // We’ll create a read-only provider to your L3 node
  const provider = new RpcProvider({ nodeUrl: import.meta.env.VITE_GRIDY_RPC_URL });

  // Create a contract instance with no "account" for read calls
  const gameContract = new Contract(GameABI, gameAddress, provider);

  // (1) get_total_bots_of_player
  // The call usually returns an array, e.g. [ "123" ] (the felt)
  const totalResp = await gameContract.call("get_total_bots_of_player", [player]);
  // The contract might return {0: "5"} or an array. We'll treat totalResp[0] as the felt string.
  const totalBots = Number(totalResp[0] ?? totalResp); 
  console.log("TOTAL BOTS =", totalBots);

  if (totalBots <= 0) {
    return [];
  }

  // (2) For each index from 0..(totalBots-1), call get_bot_of_player
  const bots: string[] = [];
  for (let i = 1; i <= totalBots; i++) {
    const botResp = await gameContract.call("get_bot_of_player", [player, i]);
    // Usually returns something like {0: "0x123abc..."} or just array [ "0x123abc..." ]
    const rawAddress = botResp[0] ?? botResp;
    // Normalize if needed
    const normalized = normalizeHexAddress(rawAddress.toString());
    bots.push(normalized);
  }
  console.log(bots)

  return bots;
}

/**
 * normalizeHexAddress:
 *   ensures we always have a "0x" prefix and lowercased hex
 */
function normalizeHexAddress(addr: string): string {
  console.log(addr)
  let hex = addr.trim().toLowerCase();
  if (!hex.startsWith("0x")) {
    hex = "0x" + hex;
  }
  // Some addresses might be "0x000abc" or "0xabc" - that’s fine
  return hex;
}
