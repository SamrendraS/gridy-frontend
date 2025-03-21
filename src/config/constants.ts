export const L1_TOKEN_ADDRESS = import.meta.env.VITE_L1_TOKEN_ADDRESS as `0x${string}`;
export const L2_TOKEN_ADDRESS = import.meta.env.VITE_L2_TOKEN_ADDRESS as string;
export const L1_BRIDGE_ADDRESS = import.meta.env.VITE_L1_BRIDGE_ADDRESS as `0x${string}`;
export const L2_BRIDGE_ADDRESS = import.meta.env.VITE_L2_BRIDGE_ADDRESS as `0x${string}`;
export const L2_REGISTRY = import.meta.env.VITE_L2_REGISTRY as string;
export const L3_REGISTRY = import.meta.env.VITE_L3_REGISTRY as string;

export const DEFAULT_DEPOSIT_AMOUNT = BigInt(
  import.meta.env.VITE_DEFAULT_DEPOSIT_AMOUNT || '1000000000000000'
);
export const DEFAULT_DEPOSIT_VALUE = BigInt(
  import.meta.env.VITE_DEPOSIT_VALUE || '10000000000000000'
);

// Example: If your bot requires 11 tokens (with 18 decimals) to deploy:
export const REQUIRED_BOT_DEPLOY_AMOUNT = 11n * 10n ** 18n;
