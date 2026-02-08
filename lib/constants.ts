// Environment configuration with defaults
export const config = {
  // Contract Configuration
  autoCapAddress: process.env.NEXT_PUBLIC_AUTOCAP_ADDRESS || "0x0000000000000000000000000000000000000000",
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://api.calibration.node.glif.io/rpc/v1",

  // Subgraph Configuration
  subgraphUrl: process.env.NEXT_PUBLIC_SUBGRAPH_URL || "https://api.goldsky.com/api/public/project_clq...",

  // Display Settings
  refreshInterval: Number(process.env.NEXT_PUBLIC_REFRESH_INTERVAL || "30000"),

  // Pagination
  participantsPageSize: Number(process.env.NEXT_PUBLIC_PARTICIPANTS_PAGE_SIZE || "100"),

  // Explorer Links (legacy, prefer network.payExplorerUrl)
  payExplorerUrl: process.env.NEXT_PUBLIC_PAY_EXPLORER_URL || "https://pay.filecoin.cloud/calibration/accounts",
} as const;

// Network configuration (calibration vs mainnet)
const _isMainnet = (process.env.NEXT_PUBLIC_NETWORK || "calibration") === "mainnet";
export const network = {
  isMainnet: _isMainnet,
  addressPrefix: _isMainnet ? "f" : "t",
  blockExplorerUrl: _isMainnet
    ? "https://filecoin.blockscout.com"
    : "https://filecoin-testnet.blockscout.com",
  payExplorerUrl: _isMainnet
    ? "https://pay.filecoin.cloud/mainnet/accounts"
    : "https://pay.filecoin.cloud/calibration/accounts",
} as const;

/** Build a block explorer URL for an actor ID */
export function actorExplorerUrl(actorId: string): string {
  return `${network.blockExplorerUrl}/search-results?q=${network.addressPrefix}0${actorId}&redirect=true`;
}

// Base URL for the app (used for docs links, etc.)
export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://filautocap.xyz";

// Filecoin constants
export const FILECOIN_GENESIS = new Date("2022-11-01T18:13:00Z");
export const SECONDS_PER_EPOCH = 30;
export const NATIVE_FIL_TOKEN = "0x0000000000000000000000000000000000000000";

// Safe & MetaAllocator constants (Filecoin Calibration)
export const SAFE_ADDRESS = "0xdb837774Fb9715F1AE70EFAfF2D1D4e76de8884b";
export const METAALLOCATOR_ADDRESS = "0xeE44Fa7Af2A8ad8aB222e4401EF8Ed5A8e18bD09";
export const LOTUS_RPC_URL = "https://calibration.filecoin.chain.love/rpc/v1";
export const MIN_DATACAP_ALLOCATION = 1048576; // 1 MiB in bytes
export const CHAIN_ID = 314159;
// Safe Transaction Service URL for Filecoin Calibration
export const SAFE_TX_SERVICE_URL = "https://transaction-testnet.safe.filecoin.io";
