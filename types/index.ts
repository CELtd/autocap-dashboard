// Round Status (derived from timestamps)
export enum RoundStatus {
  Upcoming = "upcoming",
  Open = "open",
  Closed = "closed",
}

// Round configuration from contract
export interface Round {
  id: number;
  startTime: number; // Unix timestamp
  endTime: number; // Unix timestamp
  registrationFee: bigint;
  totalDatacap: bigint;
  status: RoundStatus; // Derived from timestamps
  participantCount: number;
}

// Participant data (per round)
export interface RoundParticipant {
  address: string;
  datacapActorId: bigint; // uint64 from contract
  subgraphBurn: bigint;
  expectedAllocation: bigint;
}

// Subgraph types - Updated for new schema
export interface Payee {
  address: string;
}

export interface Rail {
  payee: Payee;
}

// Settlement from subgraph (fee = FIL burned for native FIL rails)
export interface Settlement {
  fee: string;
  blockNumber: string;
  rail: Rail;
}

// One-time payment from subgraph (fee = FIL burned for native FIL rails)
export interface OneTimePayment {
  fee: string;
  blockNumber: string;
  rail: Rail;
}

// New subgraph response structure
export interface SubgraphResponse {
  settlements: Settlement[];
  oneTimePayments: OneTimePayment[];
}

// Dashboard state
export interface DashboardState {
  selectedRoundId: number;
  currentRoundId: number;
  rounds: Round[];
  participants: RoundParticipant[];
  totalBurned: bigint;
  isLoading: boolean;
  error: Error | null;
}
