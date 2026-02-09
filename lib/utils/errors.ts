/**
 * Actor not found — single source of truth for detection and messaging.
 */
export const ACTOR_NOT_FOUND_MESSAGE =
  "Actor not found on-chain.\nPlease ensure the wallet has been funded and has at least one on-chain transaction to initialize the actor.";

const ACTOR_NOT_FOUND_PATTERNS = ["actor not found", "actor does not exist"];

/** Check whether an error string (message, shortMessage, etc.) indicates an actor-not-found condition. */
export function isActorNotFoundError(text: string): boolean {
  const lower = text.toLowerCase();
  return ACTOR_NOT_FOUND_PATTERNS.some((p) => lower.includes(p));
}

/**
 * Contract error selectors (first 4 bytes of keccak256 hash)
 */
const ERROR_SELECTORS = {
  InvalidActorId: "0xed488aa3",
  AlreadyRegistered: "0x3a81d6fc",
} as const;

/**
 * Parse contract error and return user-friendly message
 */
export function parseContractError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Transaction simulation failed";
  }

  const errorMessage = error.message?.toLowerCase() || "";
  const errorData = extractErrorData(error);
  const errorShortMessage = (error as any).shortMessage?.toLowerCase() || "";

  // Check for actor not found / does not exist
  if (isActorNotFoundError(errorMessage) || isActorNotFoundError(errorShortMessage)) {
    return ACTOR_NOT_FOUND_MESSAGE;
  }

  // Check for InvalidActorId (0xed488aa3)
  if (
    errorMessage.includes(ERROR_SELECTORS.InvalidActorId.toLowerCase()) ||
    errorShortMessage.includes(ERROR_SELECTORS.InvalidActorId.toLowerCase()) ||
    errorData?.includes(ERROR_SELECTORS.InvalidActorId.toLowerCase())
  ) {
    return "Invalid Actor ID. Please check that the Actor ID exists and is valid.";
  }

  // Check for AlreadyRegistered (0x3a81d6fc)
  if (
    errorMessage.includes(ERROR_SELECTORS.AlreadyRegistered.toLowerCase()) ||
    errorShortMessage.includes(ERROR_SELECTORS.AlreadyRegistered.toLowerCase()) ||
    errorData?.includes(ERROR_SELECTORS.AlreadyRegistered.toLowerCase())
  ) {
    return "You have already registered for this round. Each address can only register once per round.";
  }

  return error.message || "Transaction simulation failed";
}

function extractErrorData(error: any): string | null {
  const data = error.data || error.cause?.data || error.cause?.error?.data;
  if (!data) return null;

  // Convert to string safely (handles BigInt, objects, etc.)
  try {
    return String(data).toLowerCase();
  } catch {
    return null;
  }
}
