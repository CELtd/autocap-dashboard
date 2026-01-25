import { NextRequest, NextResponse } from "next/server";
import { getActorIdFromEvmAddress } from "@/lib/api/lotus";

/**
 * Get actor ID from an EVM address.
 *
 * This converts an EVM address (0x...) to its corresponding Filecoin actor ID (f0...).
 * The process:
 * 1. Convert EVM address to f410 address using EthAddressToFilecoinAddress
 * 2. Lookup the actor ID from the f410 address using StateLookupID
 */
export async function POST(request: NextRequest) {
  try {
    const { evmAddress } = await request.json();

    if (!evmAddress || typeof evmAddress !== "string") {
      return NextResponse.json(
        { error: "EVM address is required" },
        { status: 400 }
      );
    }

    // Validate EVM address format
    if (!/^0x[0-9a-fA-F]{40}$/i.test(evmAddress)) {
      return NextResponse.json(
        { error: "Invalid EVM address format" },
        { status: 400 }
      );
    }

    const actorId = await getActorIdFromEvmAddress(evmAddress);

    return NextResponse.json({ actorId });
  } catch (error) {
    console.error("Error getting actor ID from EVM address:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to get actor ID: ${message}` },
      { status: 500 }
    );
  }
}
