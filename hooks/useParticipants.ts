"use client";

import { useQuery } from "@tanstack/react-query";
import { autoCapContract } from "@/lib/contracts/config";
import { multicall3 } from "@/lib/contracts/multicall3";
import { config } from "@/lib/constants";
import type { RoundParticipant } from "@/types";

/**
 * Hook to fetch all participant addresses for a round using pagination
 */
export function useParticipantAddresses(roundId: number | undefined, participantCount: number) {
  return useQuery({
    queryKey: ["participant-addresses", roundId, participantCount],
    queryFn: async (): Promise<string[]> => {
      if (!roundId || participantCount === 0) return [];

      const allAddresses: string[] = [];
      let cursor = 0;
      const limit = config.participantsPageSize;

      try {
        // Fetch all participants with pagination
        while (cursor < participantCount) {
          const result = await multicall3([
            {
              target: autoCapContract.address,
              abi: autoCapContract.abi,
              functionName: "getParticipants",
              args: [BigInt(roundId), BigInt(cursor), BigInt(limit)],
            },
          ]);

          const [addresses, nextCursor] = result[0] as [string[], bigint];
          allAddresses.push(...addresses);

          // Break if no more participants
          if (Number(nextCursor) === 0 || addresses.length === 0) break;
          cursor = Number(nextCursor);
        }

        return allAddresses;
      } catch (error: any) {
        console.error("Failed to fetch participant addresses:", {
          roundId,
          error: error.message,
        });
        throw error;
      }
    },
    enabled: !!roundId && participantCount > 0,
    staleTime: config.refreshInterval,
  });
}

/**
 * Hook to fetch participant details (datacapActorId) for a list of addresses
 */
export function useParticipantsData(roundId: number | undefined, addresses: string[]) {
  return useQuery({
    queryKey: ["participants-data", roundId, addresses],
    queryFn: async (): Promise<Map<string, bigint>> => {
      if (!roundId || addresses.length === 0) return new Map();

      try {
        const calls = addresses.map((address) => ({
          target: autoCapContract.address,
          abi: autoCapContract.abi,
          functionName: "getParticipantDetails" as const,
          args: [BigInt(roundId), address as `0x${string}`] as const,
        }));

        const results = await multicall3(calls);

        const dataMap = new Map<string, bigint>();
        results.forEach((result, index) => {
          const datacapActorId = result as bigint;
          dataMap.set(addresses[index].toLowerCase(), datacapActorId);
        });

        return dataMap;
      } catch (error: any) {
        console.error("Failed to fetch participants data:", {
          roundId,
          addressCount: addresses.length,
          error: error.message,
        });
        throw error;
      }
    },
    enabled: !!roundId && addresses.length > 0,
    refetchInterval: config.refreshInterval,
    staleTime: 10000,
  });
}

/**
 * Combined participant data with burn info
 */
export interface ParticipantWithBurnData {
  participants: RoundParticipant[];
  totalBurn: bigint;
}
