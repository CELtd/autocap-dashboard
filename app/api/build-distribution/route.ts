import { NextResponse } from "next/server";
import { encodeFunctionData } from "viem";
import { filecoinIdToClientAddressBytes, buildClientAddressBytes } from "@/lib/api/lotus";
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
  testRecipientOverride: boolean;
  testRecipientAddress: string | null;
  testInjectExtraWinner: boolean;
}

// =============================================================================
// TEST MODE FLAGS - Set ALL to false for production!
// =============================================================================

// TEST_MODE: Override allocation amount to 1 MiB for testing
const TEST_MODE = true;
const TEST_ALLOCATION_AMOUNT = BigInt(MIN_DATACAP_ALLOCATION); // 1 MiB

// TEST_RECIPIENT_OVERRIDE: Skip Lotus RPC conversion and use hardcoded address
// This allows testing the Safe transaction building/signing flow without
// relying on Lotus RPC. ALL recipients will receive DC at this address.
const TEST_RECIPIENT_OVERRIDE = true;
const TEST_RECIPIENT_ADDRESS = "0xa45882Cc3594d79ddeA910a0376f7Ff2e521d3fd";

// TEST_INJECT_EXTRA_WINNER: Add a fake second winner to test batch transactions
// This creates 2 transactions in the Safe batch to verify batching works.
const TEST_INJECT_EXTRA_WINNER = true;
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
        // Convert Filecoin ID to clientAddressBytes
        // In TEST_RECIPIENT_OVERRIDE mode, skip Lotus RPC and use hardcoded address
        let clientAddressBytes: `0x${string}`;
        let resolvedAddress: string;

        if (TEST_RECIPIENT_OVERRIDE) {
          // ⚠️ TEST MODE: Using hardcoded recipient address
          // This bypasses the Lotus RPC conversion for testing Safe tx flow
          clientAddressBytes = buildClientAddressBytes(TEST_RECIPIENT_ADDRESS);
          resolvedAddress = TEST_RECIPIENT_ADDRESS;
        } else {
          // Production: Convert f0... address via Lotus RPC
          clientAddressBytes = await filecoinIdToClientAddressBytes(
            allocation.datacapActorId
          );
          resolvedAddress = allocation.address;
        }

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
            recipientAddress: resolvedAddress,
            datacapActorId: allocation.datacapActorId,
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
      const clientAddressBytes = buildClientAddressBytes(TEST_RECIPIENT_ADDRESS);
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
          recipientAddress: TEST_RECIPIENT_ADDRESS,
          datacapActorId: TEST_EXTRA_WINNER_ACTOR_ID,
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
      testRecipientOverride: TEST_RECIPIENT_OVERRIDE,
      testRecipientAddress: TEST_RECIPIENT_OVERRIDE ? TEST_RECIPIENT_ADDRESS : null,
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
