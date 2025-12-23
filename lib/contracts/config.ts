import { createPublicClient, http, type Address, type Chain } from "viem";
import { config } from "../constants";
import { autoCapAbi } from "./abi";

// Filecoin Calibration Testnet chain definition
export const filecoinCalibration: Chain = {
  id: 314159,
  name: "Filecoin Calibration",
  nativeCurrency: {
    decimals: 18,
    name: "testnet filecoin",
    symbol: "tFIL",
  },
  rpcUrls: {
    default: { http: [config.rpcUrl] },
    public: { http: [config.rpcUrl] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://filecoin-testnet.blockscout.com",
    },
  },
  testnet: true,
};

// Create public client for reading contract data
export const publicClient = createPublicClient({
  chain: filecoinCalibration,
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

