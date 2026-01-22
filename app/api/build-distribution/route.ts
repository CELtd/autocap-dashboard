import { NextResponse } from "next/server";
import { encodeFunctionData } from "viem";
import { filecoinIdToClientAddressBytes, lookupRobustAddress } from "@/lib/api/lotus";
import { metaAllocatorAbi } from "@/lib/contracts/metaAllocatorAbi";
import {
  METAALLOCATOR_ADDRESS,
  MIN_DATACAP_ALLOCATION,
  config,
} from "@/lib/constants";

interface LatestRoundAllocation {
  address: string;
  datacapActorId: string;
  allocatedDatacap: string;
}

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
  allocations: LatestRoundAllocation[] | null;
}

interface SafeTransaction {
  to: string;
  value: string;
  data: string;
  // Additional metadata for UI display
  meta: {
    recipientAddress: string;
    datacapActorId: string;
    datacapActorIdOriginal: string;
    robustAddress: string;
    clientAddressBytes: string;
    allocatedDatacap: string;
    allocatedDatacapOriginal: string;
  };
}

interface SkippedAllocation {
  address: string;
  datacapActorId: string;
  allocatedDatacap: string;
  reason: string;
}

interface BuildDistributionResponse {
  roundId: number;
  roundStatus: string;
  transactions: SafeTransaction[];
  skipped: SkippedAllocation[];
  totalDatacapToDistribute: string;
  testMode: boolean;
  testOverrideActorId: string | null;
  testInjectExtraWinner: boolean;
}

// =============================================================================
// TEST MODE FLAGS - Set ALL to false for production!
// =============================================================================

// TEST_MODE: Override allocation amount to 1 MiB for testing
const TEST_MODE = true;
const TEST_ALLOCATION_AMOUNT = BigInt(MIN_DATACAP_ALLOCATION); // 1 MiB

// TEST_OVERRIDE_ACTOR_ID: Override the recipient actor ID for all allocations
// Uses Lotus RPC to convert this f0 address to clientAddressBytes
// Set to null to use the real actor IDs from allocation data
const TEST_OVERRIDE_ACTOR_ID: string | null = "f01433";

// TEST_INJECT_EXTRA_WINNER: Add a fake second winner to test batch transactions
// This creates 2 transactions in the Safe batch to verify batching works.
const TEST_INJECT_EXTRA_WINNER = false;
const TEST_EXTRA_WINNER_ACTOR_ID = "f099999"; // Fake actor ID for display

// =============================================================================

export async function GET() {
  try {
    // 1. Fetch latest round data from our API
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `http://localhost:${process.env.PORT || 3000}`;

    const latestRoundRes = await fetch(`${baseUrl}/api/latest-round`);
    if (!latestRoundRes.ok) {
      throw new Error("Failed to fetch latest round data");
    }

    const latestRound: LatestRoundResponse = await latestRoundRes.json();

    // 2. Validate round is closed
    if (latestRound.round.status !== "closed") {
      return NextResponse.json(
        {
          error: "Round is not closed",
          roundId: latestRound.round.id,
          roundStatus: latestRound.round.status,
        },
        { status: 400 }
      );
    }

    if (!latestRound.allocations || latestRound.allocations.length === 0) {
      return NextResponse.json(
        {
          error: "No allocations found for this round",
          roundId: latestRound.round.id,
        },
        { status: 400 }
      );
    }

    // 3. Process allocations
    const transactions: SafeTransaction[] = [];
    const skipped: SkippedAllocation[] = [];
    let totalDatacapToDistribute = 0n;

    for (const allocation of latestRound.allocations) {
      const allocatedDatacap = BigInt(allocation.allocatedDatacap);

      // Skip zero allocations
      if (allocatedDatacap === 0n) {
        skipped.push({
          ...allocation,
          reason: "Zero allocation",
        });
        continue;
      }

      // Skip allocations below minimum (1 MiB)
      if (allocatedDatacap < BigInt(MIN_DATACAP_ALLOCATION)) {
        skipped.push({
          ...allocation,
          reason: `Below minimum ${MIN_DATACAP_ALLOCATION} bytes (1 MiB)`,
        });
        continue;
      }

      try {
        // Determine which actor ID to use
        // In TEST_OVERRIDE_ACTOR_ID mode, use the test actor ID instead of the real one
        const actorIdToUse = TEST_OVERRIDE_ACTOR_ID ?? allocation.datacapActorId;

        // Convert Filecoin ID to clientAddressBytes (local encoding, no RPC)
        const clientAddressBytes = await filecoinIdToClientAddressBytes(actorIdToUse);

        // Lookup robust address via Lotus RPC for display
        const robustAddress = await lookupRobustAddress(actorIdToUse);

        // Use test amount if in test mode, otherwise use actual allocation
        const amountToDistribute = TEST_MODE ? TEST_ALLOCATION_AMOUNT : allocatedDatacap;

        // Encode addVerifiedClient calldata
        const calldata = encodeFunctionData({
          abi: metaAllocatorAbi,
          functionName: "addVerifiedClient",
          args: [clientAddressBytes, amountToDistribute],
        });

        transactions.push({
          to: METAALLOCATOR_ADDRESS,
          value: "0",
          data: calldata,
          meta: {
            recipientAddress: allocation.address,
            datacapActorId: actorIdToUse,
            datacapActorIdOriginal: allocation.datacapActorId,
            robustAddress: robustAddress,
            clientAddressBytes: clientAddressBytes,
            allocatedDatacap: amountToDistribute.toString(),
            allocatedDatacapOriginal: allocatedDatacap.toString(),
          },
        });

        totalDatacapToDistribute += amountToDistribute;
      } catch (error) {
        skipped.push({
          ...allocation,
          reason: `Failed to resolve address: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }

    // 4. Inject extra test winner for batch transaction testing
    if (TEST_INJECT_EXTRA_WINNER) {
      const actorIdForExtra = TEST_OVERRIDE_ACTOR_ID ?? TEST_EXTRA_WINNER_ACTOR_ID;
      const clientAddressBytes = await filecoinIdToClientAddressBytes(actorIdForExtra);
      const robustAddress = await lookupRobustAddress(actorIdForExtra);
      const amountToDistribute = TEST_ALLOCATION_AMOUNT;

      const calldata = encodeFunctionData({
        abi: metaAllocatorAbi,
        functionName: "addVerifiedClient",
        args: [clientAddressBytes, amountToDistribute],
      });

      transactions.push({
        to: METAALLOCATOR_ADDRESS,
        value: "0",
        data: calldata,
        meta: {
          recipientAddress: "injected-test-winner",
          datacapActorId: actorIdForExtra,
          datacapActorIdOriginal: TEST_EXTRA_WINNER_ACTOR_ID,
          robustAddress: robustAddress,
          clientAddressBytes: clientAddressBytes,
          allocatedDatacap: amountToDistribute.toString(),
          allocatedDatacapOriginal: "0", // Injected, no original
        },
      });

      totalDatacapToDistribute += amountToDistribute;
    }

    // 5. Sort transactions by address for deterministic ordering
    transactions.sort((a, b) => a.data.localeCompare(b.data));

    const response: BuildDistributionResponse = {
      roundId: latestRound.round.id,
      roundStatus: latestRound.round.status,
      transactions,
      skipped,
      totalDatacapToDistribute: totalDatacapToDistribute.toString(),
      testMode: TEST_MODE,
      testOverrideActorId: TEST_OVERRIDE_ACTOR_ID,
      testInjectExtraWinner: TEST_INJECT_EXTRA_WINNER,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error building distribution:", error);
    return NextResponse.json(
      {
        error: "Failed to build distribution transactions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
