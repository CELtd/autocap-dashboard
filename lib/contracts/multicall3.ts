import { encodeFunctionData, decodeFunctionResult, type Address, type Abi } from "viem";
import { publicClient } from "./config";

// Multicall3 contract address (same on Calibration and Mainnet)
export const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11" as Address;

// Multicall3 ABI (just the aggregate3 function we need)
const multicall3Abi = [
  {
    inputs: [
      {
        components: [
          { name: "target", type: "address" },
          { name: "allowFailure", type: "bool" },
          { name: "callData", type: "bytes" },
        ],
        name: "calls",
        type: "tuple[]",
      },
    ],
    name: "aggregate3",
    outputs: [
      {
        components: [
          { name: "success", type: "bool" },
          { name: "returnData", type: "bytes" },
        ],
        name: "returnData",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Execute multiple contract calls using Multicall3
 */
export async function multicall3<T extends readonly unknown[]>(calls: {
  target: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
}[]): Promise<T> {
  // Encode all function calls
  const encodedCalls = calls.map((call) => {
    const callData = encodeFunctionData({
      abi: call.abi,
      functionName: call.functionName,
      args: call.args,
    });

    return {
      target: call.target,
      allowFailure: false,
      callData,
    };
  });

  // Execute multicall
  const results = await publicClient.readContract({
    address: MULTICALL3_ADDRESS,
    abi: multicall3Abi,
    functionName: "aggregate3",
    args: [encodedCalls],
  });

  // Decode all results
  const decodedResults = results.map((result, index) => {
    if (!result.success) {
      throw new Error(
        `Multicall3 call ${index} (${calls[index].functionName}) failed: ${result.returnData}`
      );
    }

    return decodeFunctionResult({
      abi: calls[index].abi,
      functionName: calls[index].functionName,
      data: result.returnData,
    });
  });

  return decodedResults as unknown as T;
}

