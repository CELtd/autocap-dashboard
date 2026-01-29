"use client";

import { useQuery } from "@tanstack/react-query";
import { subgraphClient } from "@/lib/subgraph/client";
import {
  GET_ALL_PARTICIPANTS_BURN,
  NATIVE_FIL_TOKEN_ADDRESS,
  type GetAllParticipantsBurnVars,
} from "@/lib/subgraph/queries";
import { aggregateBurnByPayee, calculateTotalFromMap } from "@/lib/utils/calculations";
import { config } from "@/lib/constants";
import { timestampToEpoch } from "@/lib/utils/format";
import type { SubgraphResponse } from "@/types";

interface BurnData {
  burnByPayee: Map<string, bigint>;
  totalBurn: bigint;
}

/**
 * Hook to fetch burn data from the Filecoin Pay subgraph
 * Only fetches FIL burned from native FIL rails (token = 0x0)
 * @param payees - List of payee addresses
 * @param startTime - Round start time (Unix timestamp)
 * @param endTime - Round end time (Unix timestamp)
 */
export function useSubgraphBurn(payees: string[], startTime?: number, endTime?: number) {
  // Convert timestamps to epochs for subgraph query
  const startEpoch = startTime ? timestampToEpoch(startTime) : 0;
  const endEpoch = endTime ? timestampToEpoch(endTime) : 0;

  return useQuery({
    queryKey: ["subgraph-burn", payees, startEpoch, endEpoch],
    queryFn: async (): Promise<BurnData> => {
      if (payees.length === 0 || !startTime || !endTime) {
        return { burnByPayee: new Map(), totalBurn: 0n };
      }

      try {
        const variables: GetAllParticipantsBurnVars = {
          payees: payees.map((p) => p.toLowerCase()),
          startEpoch: startEpoch.toString(),
          endEpoch: endEpoch.toString(),
          nativeFilToken: NATIVE_FIL_TOKEN_ADDRESS,
        };

        const data = await subgraphClient.request<SubgraphResponse>(
          GET_ALL_PARTICIPANTS_BURN,
          variables
        );

        // aggregateBurnByPayee now handles both settlements and oneTimePayments
        const burnByPayee = aggregateBurnByPayee(data);
        const totalBurn = calculateTotalFromMap(burnByPayee);

        return { burnByPayee, totalBurn };
      } catch (error) {
        console.error("Subgraph query failed:", error);
        // Return empty data on error, allowing graceful degradation
        return { burnByPayee: new Map(), totalBurn: 0n };
      }
    },
    enabled: payees.length > 0 && !!startTime && !!endTime,
    refetchInterval: config.refreshInterval,
    staleTime: 10000,
    retry: 3,
  });
}
