export const autoCapAbi = [
  // Round management
  {
    name: "currentRoundId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "rounds",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_roundId", type: "uint256" }],
    outputs: [
      { name: "startTime", type: "uint256" },
      { name: "endTime", type: "uint256" },
      { name: "registrationFee", type: "uint256" },
      { name: "totalDatacap", type: "uint256" },
    ],
  },
  {
    name: "getRound",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_roundId", type: "uint256" }],
    outputs: [
      { name: "startTime", type: "uint256" },
      { name: "endTime", type: "uint256" },
      { name: "registrationFee", type: "uint256" },
      { name: "totalDatacap", type: "uint256" },
    ],
  },
  {
    name: "isRoundOpen",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_roundId", type: "uint256" }],
    outputs: [{ name: "isOpen", type: "bool" }],
  },
  {
    name: "getParticipants",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_roundId", type: "uint256" },
      { name: "_cursor", type: "uint256" },
      { name: "_limit", type: "uint256" },
    ],
    outputs: [
      { name: "participants", type: "address[]" },
      { name: "nextCursor", type: "uint256" },
    ],
  },
  {
    name: "getParticipantDetails",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_roundId", type: "uint256" },
      { name: "_participant", type: "address" },
    ],
    outputs: [{ name: "datacapActorId", type: "uint64" }],
  },
  {
    name: "getTotalRegistrants",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_roundId", type: "uint256" }],
    outputs: [{ name: "count", type: "uint256" }],
  },
  {
    name: "roundRegistrations",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_roundId", type: "uint256" },
      { name: "_participant", type: "address" },
    ],
    outputs: [{ name: "", type: "uint64" }],
  },
  {
    name: "register",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "_roundId", type: "uint256" },
      { name: "_datacapActorId", type: "uint64" },
    ],
    outputs: [],
  },
  {
    name: "paymentContract",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;
