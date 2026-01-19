import { NextResponse } from "next/server";
import {
  getCurrentRoundId,
  getRoundData,
  getParticipantAddresses,
  getParticipantsDetails,
  getParticipantAllocations,
  type ParticipantAllocation,
} from "@/lib/api/rounds";
import { RoundStatus } from "@/types";

/**
 * Response structure for the latest round API
 */
interface LatestRoundResponse {
  round: {
    id: number;
    status: string;
    startTime: number;
    endTime: number;
    totalDatacap: string;
    registrationFee: string;
    participantCount: number;
  };
  allocations: ParticipantAllocation[] | null;
}

export async function GET() {
  try {
    // 1. Get the current round ID
    const roundId = await getCurrentRoundId();

    // 2. Get round data
    const round = await getRoundData(roundId);

    // 3. Build response with bigint values as strings
    const response: LatestRoundResponse = {
      round: {
        id: round.id,
        status: round.status,
        startTime: round.startTime,
        endTime: round.endTime,
        totalDatacap: round.totalDatacap.toString(),
        registrationFee: round.registrationFee.toString(),
        participantCount: round.participantCount,
      },
      allocations: null,
    };

    // 4. If round is closed, fetch allocations
    if (round.status === RoundStatus.Closed) {
      const addresses = await getParticipantAddresses(
        roundId,
        round.participantCount
      );
      const datacapActorIds = await getParticipantsDetails(roundId, addresses);
      const allocations = await getParticipantAllocations(
        round,
        addresses,
        datacapActorIds
      );
      response.allocations = allocations;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching latest round:", error);
    return NextResponse.json(
      { error: "Failed to fetch latest round data" },
      { status: 500 }
    );
  }
}
