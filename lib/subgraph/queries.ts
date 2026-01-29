import { gql } from "graphql-request";
import { NATIVE_FIL_TOKEN } from "@/lib/constants";

// Native FIL token address for filtering
export const NATIVE_FIL_TOKEN_ADDRESS = NATIVE_FIL_TOKEN;

// Query for a single participant's burn data within the round
// Only fetches FIL-based rails where fee = FIL burned
export const GET_PARTICIPANT_BURN = gql`
  query GetParticipantBurn($payee: Bytes!, $startEpoch: BigInt!, $endEpoch: BigInt!, $nativeFilToken: Bytes!) {
    settlements(
      where: {
        blockNumber_gte: $startEpoch
        blockNumber_lte: $endEpoch
        rail_: {
          payee: $payee
          token: $nativeFilToken
        }
      }
    ) {
      fee
      blockNumber
    }
    oneTimePayments(
      where: {
        blockNumber_gte: $startEpoch
        blockNumber_lte: $endEpoch
        rail_: {
          payee: $payee
          token: $nativeFilToken
        }
      }
    ) {
      fee
      blockNumber
    }
  }
`;

// Batch query for multiple participants (more efficient)
// Only fetches FIL-based rails where fee = FIL burned
export const GET_ALL_PARTICIPANTS_BURN = gql`
  query GetAllParticipantsBurn($payees: [Bytes!]!, $startEpoch: BigInt!, $endEpoch: BigInt!, $nativeFilToken: Bytes!) {
    settlements(
      where: {
        blockNumber_gte: $startEpoch
        blockNumber_lte: $endEpoch
        rail_: {
          payee_in: $payees
          token: $nativeFilToken
        }
      }
    ) {
      fee
      blockNumber
      rail {
        payee {
          address
        }
      }
    }
    oneTimePayments(
      where: {
        blockNumber_gte: $startEpoch
        blockNumber_lte: $endEpoch
        rail_: {
          payee_in: $payees
          token: $nativeFilToken
        }
      }
    ) {
      fee
      blockNumber
      rail {
        payee {
          address
        }
      }
    }
  }
`;

// Types for query variables
export interface GetParticipantBurnVars {
  payee: string;
  startEpoch: string;
  endEpoch: string;
  nativeFilToken: string;
}

export interface GetAllParticipantsBurnVars {
  payees: string[];
  startEpoch: string;
  endEpoch: string;
  nativeFilToken: string;
}
