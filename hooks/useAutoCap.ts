"use client";

import { useQuery } from "@tanstack/react-query";
import { autoCapContract, publicClient } from "@/lib/contracts/config";
import { multicall3 } from "@/lib/contracts/multicall3";
import { config } from "@/lib/constants";
import { RoundStatus, type Round } from "@/types";
import { getCurrentTimestamp } from "@/lib/utils/format";

/**
 * Derive round status from timestamps
 */
export function getRoundStatus(startTime: number, endTime: number): RoundStatus {
  const now = getCurrentTimestamp();
  if (now < startTime) return RoundStatus.Upcoming;
  if (now > endTime) return RoundStatus.Closed;
  return RoundStatus.Open;
}

/**
 * Hook to fetch current round ID
 */
export function useCurrentRoundId() {
  return useQuery({
    queryKey: ["current-round-id"],
    queryFn: async (): Promise<number> => {
      if (!config.autoCapAddress || config.autoCapAddress === "0x0000000000000000000000000000000000000000") {
        throw new Error(`Invalid contract address: ${config.autoCapAddress}. Please set NEXT_PUBLIC_AUTOCAP_ADDRESS in .env.local`);
      }

      try {
        const result = await publicClient.readContract({
          address: autoCapContract.address,
          abi: autoCapContract.abi,
          functionName: "currentRoundId",
        });

        return Number(result);
      } catch (error: any) {
        console.error("Failed to fetch current round ID:", error.message);
        throw error;
      }
    },
    refetchInterval: config.refreshInterval,
    staleTime: 10000,
  });
}

/**
 * Hook to fetch round data by ID
 */
export function useRound(roundId: number | undefined) {
  return useQuery({
    queryKey: ["round", roundId],
    queryFn: async (): Promise<Round> => {
      if (roundId === undefined || roundId <= 0) {
        throw new Error("Invalid round ID");
      }

      try {
        const [roundData, participantCount] = await multicall3([
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

        const [startTime, endTime, registrationFee, totalDatacap] = roundData as [bigint, bigint, bigint, bigint];

        return {
          id: roundId,
          startTime: Number(startTime),
          endTime: Number(endTime),
          registrationFee,
          totalDatacap,
          status: getRoundStatus(Number(startTime), Number(endTime)),
          participantCount: Number(participantCount),
        };
      } catch (error: any) {
        console.error("Failed to fetch round:", {
          roundId,
          error: error.message,
        });
        throw error;
      }
    },
    enabled: roundId !== undefined && roundId > 0,
    refetchInterval: config.refreshInterval,
    staleTime: 10000,
  });
}

/**
 * Hook to fetch all rounds (for round selector)
 */
export function useAllRounds(currentRoundId: number | undefined) {
  return useQuery({
    queryKey: ["all-rounds", currentRoundId],
    queryFn: async (): Promise<Round[]> => {
      if (currentRoundId === undefined || currentRoundId <= 0) {
        return [];
      }

      try {
        // Fetch data for all rounds in parallel
        const roundCalls = [];
        const countCalls = [];

        for (let i = 1; i <= currentRoundId; i++) {
          roundCalls.push({
            target: autoCapContract.address,
            abi: autoCapContract.abi,
            functionName: "getRound" as const,
            args: [BigInt(i)] as const,
          });
          countCalls.push({
            target: autoCapContract.address,
            abi: autoCapContract.abi,
            functionName: "getTotalRegistrants" as const,
            args: [BigInt(i)] as const,
          });
        }

        const [roundResults, countResults] = await Promise.all([
          multicall3(roundCalls),
          multicall3(countCalls),
        ]);

        const rounds: Round[] = [];

        for (let i = 0; i < currentRoundId; i++) {
          const roundData = roundResults[i] as [bigint, bigint, bigint, bigint];
          const participantCount = countResults[i] as bigint;
          const roundId = i + 1;

          rounds.push({
            id: roundId,
            startTime: Number(roundData[0]),
            endTime: Number(roundData[1]),
            registrationFee: roundData[2],
            totalDatacap: roundData[3],
            status: getRoundStatus(Number(roundData[0]), Number(roundData[1])),
            participantCount: Number(participantCount),
          });
        }

        // Return in descending order (newest first)
        return rounds.reverse();
      } catch (error: any) {
        console.error("Failed to fetch all rounds:", error.message);
        throw error;
      }
    },
    enabled: currentRoundId !== undefined && currentRoundId > 0,
    refetchInterval: config.refreshInterval,
    staleTime: 10000,
  });
}

