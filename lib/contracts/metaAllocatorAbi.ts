export const metaAllocatorAbi = [
  {
    inputs: [
      { internalType: "bytes", name: "clientAddress", type: "bytes" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "addVerifiedClient",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
