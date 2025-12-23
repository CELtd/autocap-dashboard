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

// Subgraph types
export interface Settlement {
  filBurned: string;
  blockNumber: string;
}

export interface Payee {
  address: string;
}

export interface Rail {
  payee: Payee;
  railId: string;
  settlements: Settlement[];
}

export interface SubgraphResponse {
  rails: Rail[];
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
