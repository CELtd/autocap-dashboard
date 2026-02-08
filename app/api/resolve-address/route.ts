import { NextRequest, NextResponse } from "next/server";
import { resolveAddressToActorId } from "@/lib/api/lotus";

/**
 * Resolve any Filecoin or EVM address to a numeric actor ID.
 *
 * Accepts: f0, f1, f2, f3, f4, 0x addresses, or plain numeric actor IDs.
 * Returns the numeric actor ID.
 */
export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    const trimmed = address.trim();
    if (!trimmed) {
      return NextResponse.json(
        { error: "Address cannot be empty" },
        { status: 400 }
      );
    }

    const actorId = await resolveAddressToActorId(trimmed);

    return NextResponse.json({ actorId });
  } catch (error) {
    console.error("Error resolving address:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to resolve address: ${message}` },
      { status: 500 }
    );
  }
}
