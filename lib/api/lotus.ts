import { LOTUS_RPC_URL } from "../constants";

interface LotusRpcResponse<T> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Call Lotus JSON-RPC method
 */
async function lotusRpc<T>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch(LOTUS_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`Lotus RPC request failed: ${response.statusText}`);
  }

  const data: LotusRpcResponse<T> = await response.json();

  if (data.error) {
    throw new Error(`Lotus RPC error: ${data.error.message}`);
  }

  if (data.result === undefined) {
    throw new Error("Lotus RPC returned no result");
  }

  return data.result;
}

/**
 * Convert Filecoin ID address (f0...) to EVM address (0x...)
 */
export async function filecoinIdToEvmAddress(filecoinId: string): Promise<string> {
  const evmAddress = await lotusRpc<string>(
    "Filecoin.FilecoinAddressToEthAddress",
    [filecoinId]
  );
  return evmAddress;
}

/**
 * Build MetaAllocator clientAddressBytes from EVM address
 * Format: 0x040a + <20-byte EVM address (lowercase, no 0x)>
 *
 * 0x04 = Protocol 4 (f4/delegated addresses)
 * 0x0a = Namespace 10 (Ethereum Address Manager)
 */
export function buildClientAddressBytes(evmAddress: string): `0x${string}` {
  // Remove 0x prefix and lowercase
  const addressWithoutPrefix = evmAddress.slice(2).toLowerCase();
  return `0x040a${addressWithoutPrefix}`;
}

/**
 * Convert Filecoin ID to MetaAllocator clientAddressBytes
 * Combines filecoinIdToEvmAddress and buildClientAddressBytes
 */
export async function filecoinIdToClientAddressBytes(
  filecoinId: string
): Promise<`0x${string}`> {
  const evmAddress = await filecoinIdToEvmAddress(filecoinId);
  return buildClientAddressBytes(evmAddress);
}
