import { Contract, RpcProvider } from "starknet";

// Minimal ABI
const GameABI = [
  {
    type: "function",
    name: "get_total_bots_of_player",
    inputs: [
      { name: "player", type: "core::starknet::contract_address::ContractAddress" },
    ],
    outputs: [{ type: "core::felt252" }],
    state_mutability: "view",
  },
  {
    type: "function",
    name: "get_bot_of_player",
    inputs: [
      { name: "player", type: "core::starknet::contract_address::ContractAddress" },
      { name: "index", type: "core::felt252" },
    ],
    outputs: [{ type: "core::starknet::contract_address::ContractAddress" }],
    state_mutability: "view",
  },
];

/**
 * fetchPlayerBots:
 *  - get_total_bots_of_player(player) -> total
 *  - for i in [0..total-1], get_bot_of_player(player, i)
 *  - return array of hex addresses
 */
export async function fetchPlayerBots(
  gameAddress: string,
  player: string
): Promise<string[]> {
  const provider = new RpcProvider({ nodeUrl: import.meta.env.VITE_GRIDY_RPC_URL });
  const gameContract = new Contract(GameABI, gameAddress, provider);

  const totalResp = await gameContract.call("get_total_bots_of_player", [player]);
  const totalBots = Number(totalResp[0] ?? totalResp);
  console.log("TOTAL BOTS =", totalBots);

  if (totalBots <= 0) {
    return [];
  }

  const bots: string[] = [];
  for (let i = 1; i <= totalBots; i++) {
    const botResp = await gameContract.call("get_bot_of_player", [player, i]);
    const rawAddress = botResp[0] ?? botResp;
    bots.push(normalizeHexAddress(String(rawAddress)));
  }
  console.log("Fetched bots:", bots);
  return bots;
}

function normalizeHexAddress(addr: string): string {
  let hex = addr.trim().toLowerCase();
  if (!hex.startsWith("0x")) {
    hex = "0x" + hex;
  }
  return hex;
}
