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
 * Encode a number as Unsigned LEB128 (Variable-length encoding)
 * Used for Filecoin address payloads
 *
 * Example: 1433 -> [0x99, 0x0b]
 */
function encodeULEB128(value: bigint): Uint8Array {
  if (value < 0n) {
    throw new Error("ULEB128 cannot encode negative numbers");
  }

  const bytes: number[] = [];

  do {
    let byte = Number(value & 0x7fn); // Take lower 7 bits
    value >>= 7n; // Shift right by 7

    if (value !== 0n) {
      byte |= 0x80; // Set continuation bit if more bytes follow
    }

    bytes.push(byte);
  } while (value !== 0n);

  // Handle the special case of value = 0
  if (bytes.length === 0) {
    bytes.push(0);
  }

  return new Uint8Array(bytes);
}

/**
 * Convert Uint8Array to hex string with 0x prefix
 */
function bytesToHex(bytes: Uint8Array): `0x${string}` {
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `0x${hex}`;
}

/**
 * Encode a Filecoin ID address (f0/t0) to raw address bytes
 * Format: 0x00 (protocol) + ULEB128(actorId)
 *
 * Example: f01433 -> 0x00990b
 *   - 0x00 = Protocol 0 (ID address)
 *   - 0x990b = ULEB128(1433)
 */
export function encodeIdAddress(actorId: bigint): `0x${string}` {
  const protocolByte = new Uint8Array([0x00]); // Protocol 0 = ID address
  const idBytes = encodeULEB128(actorId);

  const result = new Uint8Array(1 + idBytes.length);
  result.set(protocolByte, 0);
  result.set(idBytes, 1);

  return bytesToHex(result);
}

/**
 * Encode an EVM address as delegated Filecoin address bytes (f410 space)
 * Format: 0x04 (protocol) + 0x0a (namespace 10) + 20-byte EVM address
 *
 * This is ONLY for true EVM/f410 addresses, NOT for f0 addresses!
 *
 * Example: 0x1234...abcd -> 0x040a1234...abcd
 *   - 0x04 = Protocol 4 (delegated address)
 *   - 0x0a = Namespace 10 (Ethereum Address Manager, per FIP-0055)
 *   - Remaining 20 bytes = EVM address
 */
export function encodeEvmAddress(evmAddress: string): `0x${string}` {
  // Validate EVM address format
  if (!/^0x[0-9a-fA-F]{40}$/.test(evmAddress)) {
    throw new Error(`Invalid EVM address format: ${evmAddress}`);
  }

  // Remove 0x prefix and lowercase
  const addressWithoutPrefix = evmAddress.slice(2).toLowerCase();
  return `0x040a${addressWithoutPrefix}`;
}

/**
 * Parse a Filecoin address string and return raw address bytes for MetaAllocator
 *
 * Supported formats:
 * - f0/t0 (ID addresses): e.g., "f01433" -> 0x00990b
 * - EVM addresses: e.g., "0x1234..." -> 0x040a1234...
 *
 * The MetaAllocator.addVerifiedClient(bytes clientAddress, uint256 amount) expects
 * raw Filecoin address bytes, NOT synthetic EVM mappings.
 */
export function addressToClientBytes(address: string): `0x${string}` {
  // Check for ID address (f0/t0)
  const idMatch = address.match(/^[ft]0(\d+)$/i);
  if (idMatch) {
    const actorId = BigInt(idMatch[1]);
    return encodeIdAddress(actorId);
  }

  // Check for EVM address (0x...)
  if (/^0x[0-9a-fA-F]{40}$/i.test(address)) {
    return encodeEvmAddress(address);
  }

  // TODO: Add support for f1/t1 (secp256k1), f3/t3 (BLS), f4/t4 (delegated) if needed
  // These would require proper base32 decoding and checksum validation
  // Recommended: use a proper Filecoin address library for full support

  throw new Error(
    `Unsupported address format: ${address}. ` +
    `Supported formats: f0/t0 (ID addresses) and 0x... (EVM addresses)`
  );
}

/**
 * Convert Filecoin address to MetaAllocator clientAddressBytes
 *
 * This is the main function to use when building addVerifiedClient transactions.
 * It correctly encodes the address based on its type.
 *
 * @deprecated for f0 addresses - this function previously used FilecoinAddressToEthAddress
 * which produced incorrect results. Use addressToClientBytes() instead.
 */
export async function filecoinIdToClientAddressBytes(
  address: string
): Promise<`0x${string}`> {
  // Use the new synchronous implementation
  return addressToClientBytes(address);
}

// =============================================================================
// Lotus RPC helper functions
// =============================================================================

/**
 * Lookup the robust (t1/t3/t4) address for a given ID address (t0/f0)
 *
 * Example: t01433 -> t3rknqauc75xau5xpfej4ouiu7j7ur5aejb5pysujaazr6ih4agsmg6vx72wj7jzvjukbkqhxy37obzzn73xmq
 */
export async function lookupRobustAddress(idAddress: string): Promise<string> {
  const robustAddress = await lotusRpc<string>(
    "Filecoin.StateLookupRobustAddress",
    [idAddress, []]
  );
  return robustAddress;
}

/**
 * Convert Filecoin ID address (f0...) to EVM address (0x...)
 *
 * WARNING: This returns a SYNTHETIC EVM address (0xff...) for f0 addresses.
 * Do NOT use this for MetaAllocator clientAddressBytes!
 *
 * This is useful for:
 * - Querying EVM contracts that need the synthetic f0->EVM mapping
 * - Display purposes
 */
export async function filecoinIdToEvmAddress(filecoinId: string): Promise<string> {
  const evmAddress = await lotusRpc<string>(
    "Filecoin.FilecoinAddressToEthAddress",
    [filecoinId]
  );
  return evmAddress;
}

/**
 * @deprecated Use addressToClientBytes() or encodeEvmAddress() instead
 * This function was incorrectly used for f0 addresses
 */
export function buildClientAddressBytes(evmAddress: string): `0x${string}` {
  return encodeEvmAddress(evmAddress);
}
