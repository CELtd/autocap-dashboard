"use client";

import { useMemo, useState, useEffect } from "react";
import { useCurrentRoundId, useRound, useAllRounds } from "./useAutoCap";
import { useParticipantAddresses, useParticipantsData } from "./useParticipants";
import { useSubgraphBurn } from "./useSubgraphBurn";
import { calculateExpectedAllocation } from "@/lib/utils/calculations";
import { RoundStatus, type Round, type RoundParticipant } from "@/types";

/**
 * Main hook that aggregates all dashboard data
 */
export function useDashboard() {
  // Track selected round (defaults to current)
  const [selectedRoundId, setSelectedRoundId] = useState<number | undefined>(undefined);

  // Fetch current round ID
  const {
    data: currentRoundId,
    isLoading: isLoadingCurrentRound,
    error: currentRoundError,
  } = useCurrentRoundId();

  // Auto-select current round when it loads
  useEffect(() => {
    if (currentRoundId && selectedRoundId === undefined) {
      setSelectedRoundId(currentRoundId);
    }
  }, [currentRoundId, selectedRoundId]);

  // Fetch all rounds for selector
  const { data: allRounds, isLoading: isLoadingAllRounds } = useAllRounds(currentRoundId);

  // Fetch selected round data
  const {
    data: selectedRound,
    isLoading: isLoadingRound,
    error: roundError,
  } = useRound(selectedRoundId);

  // Fetch participant addresses for selected round
  const {
    data: addresses,
    isLoading: isLoadingAddresses,
  } = useParticipantAddresses(selectedRoundId, selectedRound?.participantCount ?? 0);

  // Fetch participant details (datacapActorId)
  const {
    data: participantDetails,
    isLoading: isLoadingParticipants,
  } = useParticipantsData(selectedRoundId, addresses ?? []);

  // Fetch burn data from subgraph (filtered by round timeframe)
  const {
    data: burnData,
    isLoading: isLoadingBurn,
  } = useSubgraphBurn(
    addresses ?? [],
    selectedRound?.startTime,
    selectedRound?.endTime
  );

  // Aggregate participant data with burn info and allocations
  const participants = useMemo((): RoundParticipant[] => {
    if (!addresses || !participantDetails || !burnData) return [];

    const totalDatacap = selectedRound?.totalDatacap ?? 0n;

    return addresses.map((address) => {
      const addressLower = address.toLowerCase();
      const datacapActorId = participantDetails.get(addressLower) ?? 0n;
      const subgraphBurn = burnData.burnByPayee.get(addressLower) ?? 0n;

      // Calculate expected allocation
      const expectedAllocation = calculateExpectedAllocation(
        subgraphBurn,
        totalDatacap,
        burnData.totalBurn
      );

      return {
        address,
        datacapActorId,
        subgraphBurn,
        expectedAllocation,
      };
    });
  }, [addresses, participantDetails, burnData, selectedRound?.totalDatacap]);

  // Calculate total burned from subgraph
  const totalBurned = burnData?.totalBurn ?? 0n;

  // Overall loading state
  const isLoading =
    isLoadingCurrentRound ||
    isLoadingAllRounds ||
    isLoadingRound ||
    isLoadingAddresses ||
    isLoadingParticipants ||
    isLoadingBurn;

  // Combined error
  const error = currentRoundError || roundError;

  return {
    // Round management
    currentRoundId,
    selectedRoundId,
    setSelectedRoundId,
    selectedRound,
    allRounds: allRounds ?? [],

    // Participants
    participants,
    participantCount: selectedRound?.participantCount ?? 0,

    // Burn data
    totalBurned,

    // Status helpers
    isRoundClosed: selectedRound?.status === RoundStatus.Closed,
    isRoundOpen: selectedRound?.status === RoundStatus.Open,
    isRoundUpcoming: selectedRound?.status === RoundStatus.Upcoming,

    // Loading & error states
    isLoading,
    error,
  };
}
