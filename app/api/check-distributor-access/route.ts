import { NextRequest, NextResponse } from "next/server";

/**
 * Check if the given wallet address is allowed to access the distribute page.
 * The allowed wallet is stored in a server-side environment variable,
 * so it's never exposed to the client.
 */
export async function POST(request: NextRequest) {
  try {
    const { wallet } = await request.json();

    if (!wallet || typeof wallet !== "string") {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const allowedWallet = process.env.ALLOWED_DISTRIBUTOR_WALLET;

    if (!allowedWallet) {
      console.error("ALLOWED_DISTRIBUTOR_WALLET environment variable is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const isAllowed =
      wallet.toLowerCase() === allowedWallet.toLowerCase();

    return NextResponse.json({ allowed: isAllowed });
  } catch (error) {
    console.error("Error checking distributor access:", error);
    return NextResponse.json(
      { error: "Failed to check access" },
      { status: 500 }
    );
  }
}
