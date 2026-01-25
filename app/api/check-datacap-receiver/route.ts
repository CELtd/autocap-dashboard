import { NextRequest, NextResponse } from "next/server";
import { checkDatacapReceiver } from "@/lib/api/lotus";

/**
 * Check if an actor can receive datacap tokens.
 *
 * This makes a static call to the UniversalReceiverHook (method 3726118371)
 * from the datacap actor (f07) to verify the target actor can receive datacap.
 *
 * Supported actor types:
 * - Account actors (f1/f3 wallets): Always succeed via fallback
 * - EthAccount actors (f410 EOAs): Always succeed via fallback
 * - Multisig actors: Succeed via explicit receiver hook
 * - EVM contracts: Must implement handle_filecoin_method for method 3726118371
 *
 * Unsupported actor types:
 * - Miner actors: Exit code 22 (USR_UNHANDLED_MESSAGE)
 * - System actors: Exit code 22
 * - EVM contracts without receiver hook: Exit code 33 (reverted)
 */
export async function POST(request: NextRequest) {
  try {
    const { actorId } = await request.json();

    if (!actorId || typeof actorId !== "string") {
      return NextResponse.json(
        { error: "Actor ID is required" },
        { status: 400 }
      );
    }

    // Validate actor ID is numeric
    if (!/^\d+$/.test(actorId)) {
      return NextResponse.json(
        { error: "Actor ID must be numeric (e.g., '1433')" },
        { status: 400 }
      );
    }

    const result = await checkDatacapReceiver(actorId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error checking datacap receiver:", error);
    return NextResponse.json(
      { canReceive: false, error: "Failed to check actor" },
      { status: 500 }
    );
  }
}
