import { NextResponse } from "next/server";
import {
  getCurrentRoundId,
  getRoundData,
  getParticipantAddresses,
  getParticipantsDetails,
  getParticipantAllocations,
  type ParticipantAllocation,
} from "@/lib/api/rounds";
import { RoundStatus, type Round } from "@/types";
import { datacapToBytes } from "@/lib/utils/format";

// Always serve fresh data; rounds change frequently
export const dynamic = "force-dynamic";

/**
 * Response structure for the latest round API
 */
interface RoundResponse {
  id: number;
  status: string;
  startTime: number;
  endTime: number;
  totalDatacap: string;
  registrationFee: string;
  participantCount: number;
}

interface LatestRoundResponse {
  latestRound: RoundResponse;
  targetRound: RoundResponse | null;
  allocations: ParticipantAllocation[] | null;
}

export async function GET() {
  try {
    // 1. Get the current (latest) round
    const latestRoundId = await getCurrentRoundId();
    const latestRoundData = await getRoundData(latestRoundId);

    // 2. Find the most recent closed round (could be the latest round itself)
    let targetRoundData: Round | null =
      latestRoundData.status === RoundStatus.Closed ? latestRoundData : null;

    if (!targetRoundData) {
      // Walk backwards until we find a closed round, or exhaust history
      for (let id = latestRoundId - 1; id >= 1; id--) {
        const candidate = await getRoundData(id);
        if (candidate.status === RoundStatus.Closed) {
          targetRoundData = candidate;
          break;
        }
      }
    }

    // 3. Shape the response objects
    const latestRound: RoundResponse = {
      id: latestRoundData.id,
      status: latestRoundData.status,
      startTime: latestRoundData.startTime,
      endTime: latestRoundData.endTime,
      totalDatacap: datacapToBytes(latestRoundData.totalDatacap).toString(),
      registrationFee: latestRoundData.registrationFee.toString(),
      participantCount: latestRoundData.participantCount,
    };

    let targetRound: RoundResponse | null = null;
    let allocations: ParticipantAllocation[] | null = null;

    if (targetRoundData) {
      targetRound = {
        id: targetRoundData.id,
        status: targetRoundData.status,
        startTime: targetRoundData.startTime,
        endTime: targetRoundData.endTime,
        totalDatacap: datacapToBytes(targetRoundData.totalDatacap).toString(),
        registrationFee: targetRoundData.registrationFee.toString(),
        participantCount: targetRoundData.participantCount,
      };

      // Only compute allocations when the target round is closed
      if (targetRoundData.status === RoundStatus.Closed) {
        const addresses = await getParticipantAddresses(
          targetRoundData.id,
          targetRoundData.participantCount
        );
        const datacapActorIds = await getParticipantsDetails(
          targetRoundData.id,
          addresses
        );
        allocations = await getParticipantAllocations(
          targetRoundData,
          addresses,
          datacapActorIds
        );
      }
    }

    const response: LatestRoundResponse = {
      latestRound,
      targetRound,
      allocations,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching latest round:", error);
    return NextResponse.json(
      { error: "Failed to fetch latest round data" },
      { status: 500 }
    );
  }
}
