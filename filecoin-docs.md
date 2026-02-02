# Filecoin Docs

## docs/address-resolution-test.md

# Address Resolution Test Instructions

This document explains how to test the address resolution flow for MetaAllocator integration.

## Flow Overview

1. Start with a Filecoin ID address (e.g., `f017840`)
2. Convert to EVM address using Lotus RPC
3. Build MetaAllocator `clientAddressBytes`

## Step 1: Convert Filecoin ID to EVM Address

Use the Lotus JSON-RPC method `Filecoin.FilecoinAddressToEthAddress`.

### Test with curl

```bash
curl -X POST https://calibration.filecoin.chain.love/rpc/v1 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "Filecoin.FilecoinAddressToEthAddress",
    "params": ["f017840"]
  }'
```

### Expected Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": "0x..."
}
```

The `result` should be a 20-byte EVM address (42 characters including `0x`).

## Step 2: Build clientAddressBytes

The MetaAllocator expects Filecoin delegated address bytes for EVM accounts:

```
clientAddressBytes = 0x040a + <20-byte EVM address (lowercase, no 0x prefix)>
```

### Example

If the EVM address is `0xa45882Cc3594d79ddeA910a0376f7Ff2e521d3fd`:

```
clientAddressBytes = 0x040aa45882cc3594d79ddea910a0376f7ff2e521d3fd
```

### Prefix Explanation

- `04` = Protocol 4 (f4/delegated addresses in Filecoin)
- `0a` = Namespace 10 (0x0a in hex = 10 in decimal, Ethereum Address Manager)

## Step 3: Verify with MetaAllocator (Optional)

You can verify the bytes format by checking the MetaAllocator contract on Calibration:

- **MetaAllocator Address**: `0xeE44Fa7Af2A8ad8aB222e4401EF8Ed5A8e18bD09`
- **Method**: `addVerifiedClient(bytes clientAddress, uint256 amount)`

## Test Script (Node.js)

```javascript
// test-address-resolution.js
const LOTUS_RPC = "https://calibration.filecoin.chain.love/rpc/v1";

async function testAddressResolution(filecoinId) {
  // Step 1: Convert f0... to 0x...
  const response = await fetch(LOTUS_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "Filecoin.FilecoinAddressToEthAddress",
      params: [filecoinId],
    }),
  });

  const data = await response.json();

  if (data.error) {
    console.error("Error:", data.error);
    return;
  }

  const evmAddress = data.result;
  console.log("Filecoin ID:", filecoinId);
  console.log("EVM Address:", evmAddress);

  // Step 2: Build clientAddressBytes
  const clientAddressBytes = "0x040a" + evmAddress.slice(2).toLowerCase();
  console.log("Client Address Bytes:", clientAddressBytes);

  return { evmAddress, clientAddressBytes };
}

// Test with an example
testAddressResolution("f017840");
```

Run with:
```bash
node test-address-resolution.js
```

## Verification Checklist

- [ ] Lotus RPC returns a valid 0x... address
- [ ] The address is 42 characters (0x + 40 hex chars)
- [ ] clientAddressBytes is 44 characters (0x040a + 40 hex chars)
- [ ] All hex characters are lowercase after the 0x prefix

## References

- [Lotus JSON-RPC Docs](https://lotus.filecoin.io/reference/json-rpc/)
- [Filecoin Address Types](https://spec.filecoin.io/appendix/address/)
