import type { Address } from "viem";
import { publicClient, autoCapContract } from "../contracts/config";
import { multicall3 } from "../contracts/multicall3";
import { subgraphClient } from "../subgraph/client";
import {
  GET_ALL_PARTICIPANTS_BURN,
  type GetAllParticipantsBurnVars,
} from "../subgraph/queries";
import {
  aggregateBurnByPayee,
  calculateTotalFromMap,
  calculateExpectedAllocation,
} from "../utils/calculations";
import { timestampToEpoch } from "../utils/format";
import { config } from "../constants";
import { RoundStatus, type Round, type SubgraphResponse } from "@/types";

/**
 * Get the current round ID from the contract
 */
export async function getCurrentRoundId(): Promise<number> {
  const result = await publicClient.readContract({
    ...autoCapContract,
    functionName: "currentRoundId",
  });
  return Number(result);
}

/**
 * Derive round status from timestamps
 */
function deriveRoundStatus(startTime: number, endTime: number): RoundStatus {
  const now = Math.floor(Date.now() / 1000);
  if (now < startTime) return RoundStatus.Upcoming;
  if (now > endTime) return RoundStatus.Closed;
  return RoundStatus.Open;
}

/**
 * Get round data including participant count via multicall
 */
export async function getRoundData(roundId: number): Promise<Round> {
  const [roundInfo, participantCount] = await multicall3<
    [
      readonly [bigint, bigint, bigint, bigint],
      bigint
    ]
  >([
    {
      target: autoCapContract.address,
      abi: autoCapContract.abi,
      functionName: "getRound",
      args: [BigInt(roundId)],
    },
    {
      target: autoCapContract.address,
      abi: autoCapContract.abi,
      functionName: "getTotalRegistrants",
      args: [BigInt(roundId)],
    },
  ]);

  const [startTime, endTime, registrationFee, totalDatacap] = roundInfo;
  const startTimeNum = Number(startTime);
  const endTimeNum = Number(endTime);

  return {
    id: roundId,
    startTime: startTimeNum,
    endTime: endTimeNum,
    registrationFee,
    totalDatacap,
    status: deriveRoundStatus(startTimeNum, endTimeNum),
    participantCount: Number(participantCount),
  };
}

/**
 * Fetch all participant addresses for a round using pagination
 */
export async function getParticipantAddresses(
  roundId: number,
  totalCount: number
): Promise<Address[]> {
  if (totalCount === 0) return [];

  const pageSize = config.participantsPageSize;
  const addresses: Address[] = [];
  let cursor = 0;

  while (cursor < totalCount) {
    const result = await publicClient.readContract({
      ...autoCapContract,
      functionName: "getParticipants",
      args: [BigInt(roundId), BigInt(cursor), BigInt(pageSize)],
    });

    const [participants] = result as [Address[], bigint];
    addresses.push(...participants);
    cursor += pageSize;
  }

  return addresses;
}

/**
 * Batch fetch participant details (datacapActorId) for multiple addresses
 */
export async function getParticipantsDetails(
  roundId: number,
  addresses: Address[]
): Promise<Map<string, bigint>> {
  if (addresses.length === 0) return new Map();

  const calls = addresses.map((address) => ({
    target: autoCapContract.address,
    abi: autoCapContract.abi,
    functionName: "getParticipantDetails",
    args: [BigInt(roundId), address],
  }));

  const results = await multicall3<bigint[]>(calls);

  const detailsMap = new Map<string, bigint>();
  addresses.forEach((address, index) => {
    detailsMap.set(address.toLowerCase(), results[index]);
  });

  return detailsMap;
}

/**
 * Allocation data for a participant
 */
export interface ParticipantAllocation {
  address: string;
  datacapActorId: string;
  allocatedDatacap: string;
}

/**
 * Get participant allocations for a closed round
 */
export async function getParticipantAllocations(
  round: Round,
  addresses: Address[],
  datacapActorIds: Map<string, bigint>
): Promise<ParticipantAllocation[]> {
  if (addresses.length === 0) return [];

  // Convert timestamps to epochs for subgraph query
  const startEpoch = timestampToEpoch(round.startTime);
  const endEpoch = timestampToEpoch(round.endTime);

  // Query subgraph for burn data
  const variables: GetAllParticipantsBurnVars = {
    payees: addresses.map((a) => a.toLowerCase()),
    startEpoch: startEpoch.toString(),
    endEpoch: endEpoch.toString(),
  };

  const subgraphData = await subgraphClient.request<SubgraphResponse>(
    GET_ALL_PARTICIPANTS_BURN,
    variables
  );

  // Aggregate burn data by payee
  const burnMap = aggregateBurnByPayee(subgraphData.rails);
  const totalBurn = calculateTotalFromMap(burnMap);

  // Calculate allocations for each participant
  const allocations: ParticipantAllocation[] = addresses.map((address) => {
    const addressLower = address.toLowerCase();
    const participantBurn = burnMap.get(addressLower) || 0n;
    const datacapActorId = datacapActorIds.get(addressLower) || 0n;

    const allocatedDatacap = calculateExpectedAllocation(
      participantBurn,
      round.totalDatacap,
      totalBurn
    );

    return {
      address,
      datacapActorId: `f0${datacapActorId}`,
      allocatedDatacap: allocatedDatacap.toString(),
    };
  });

  return allocations;
}
