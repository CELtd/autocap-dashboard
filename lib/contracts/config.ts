import { createPublicClient, http, type Address, type Chain } from "viem";
import { config } from "../constants";
import { autoCapAbi } from "./abi";

// Filecoin Mainnet chain definition
export const filecoinMainnet: Chain = {
  id: 314,
  name: "Filecoin",
  nativeCurrency: {
    decimals: 18,
    name: "filecoin",
    symbol: "FIL",
  },
  rpcUrls: {
    default: { http: [config.rpcUrl] },
    public: { http: [config.rpcUrl] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://filecoin.blockscout.com",
    },
  },
  testnet: false,
};

// Create public client for reading contract data
export const publicClient = createPublicClient({
  chain: filecoinMainnet,
  transport: http(config.rpcUrl),
});

// Contract configuration
export const autoCapContract = {
  address: config.autoCapAddress as Address,
  abi: autoCapAbi,
} as const;

// Helper to get contract address
export function getContractAddress(): Address {
  return config.autoCapAddress as Address;
}

