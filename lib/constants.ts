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

  // Explorer Links
  payExplorerUrl: process.env.NEXT_PUBLIC_PAY_EXPLORER_URL || "https://pay.filecoin.cloud/accounts",
} as const;

// Filecoin constants
export const FILECOIN_GENESIS = new Date("2022-11-01T18:13:00Z");
export const SECONDS_PER_EPOCH = 30;

// Safe & MetaAllocator constants (Filecoin Calibration)
export const SAFE_ADDRESS = "0xdb837774Fb9715F1AE70EFAfF2D1D4e76de8884b";
export const METAALLOCATOR_ADDRESS = "0xeE44Fa7Af2A8ad8aB222e4401EF8Ed5A8e18bD09";
export const LOTUS_RPC_URL = "https://calibration.filecoin.chain.love/rpc/v1";
export const MIN_DATACAP_ALLOCATION = 1048576; // 1 MiB in bytes
export const CHAIN_ID = 314159;
