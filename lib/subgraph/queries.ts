import { gql } from "graphql-request";

// Query for a single participant's burn data within the round
export const GET_PARTICIPANT_BURN = gql`
  query GetParticipantBurn($payee: String!, $startEpoch: BigInt!, $endEpoch: BigInt!) {
    rails(where: { payee: $payee, settledUpto_gte: $startEpoch }) {
      railId
      settlements(where: { blockNumber_gte: $startEpoch, blockNumber_lte: $endEpoch }) {
        filBurned
        blockNumber
      }
    }
  }
`;

// Batch query for multiple participants (more efficient)
export const GET_ALL_PARTICIPANTS_BURN = gql`
  query GetAllParticipantsBurn($payees: [String!]!, $startEpoch: BigInt!, $endEpoch: BigInt!) {
    rails(where: { payee_in: $payees, settledUpto_gte: $startEpoch }) {
      railId
      settlements(where: { blockNumber_gte: $startEpoch, blockNumber_lte: $endEpoch }) {
        filBurned
        blockNumber
      }
      payee {
        address
      }
    }
  }
`;

// Types for query variables
export interface GetParticipantBurnVars {
  payee: string;
  startEpoch: string;
  endEpoch: string;
}

export interface GetAllParticipantsBurnVars {
  payees: string[];
  startEpoch: string;
  endEpoch: string;
}

