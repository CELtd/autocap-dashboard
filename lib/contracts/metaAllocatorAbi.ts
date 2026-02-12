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
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
    ],
    name: "allowance",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
