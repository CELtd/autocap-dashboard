import type { Rail } from "@/types";

/**
 * Sum all filBurned values from settlements for a set of rails
 */
export function calculateTotalBurn(rails: Rail[]): bigint {
  let total = 0n;

  for (const rail of rails) {
    for (const settlement of rail.settlements) {
      total += BigInt(settlement.filBurned);
    }
  }

  return total;
}

/**
 * Calculate burn for a specific payee from rails
 */
export function calculatePayeeBurn(rails: Rail[], payee: string): bigint {
  const payeeLower = payee.toLowerCase();
  let total = 0n;

  for (const rail of rails) {
    if (rail.payee?.address?.toLowerCase() === payeeLower) {
      for (const settlement of rail.settlements) {
        total += BigInt(settlement.filBurned);
      }
    }
  }

  return total;
}

/**
 * Calculate expected DataCap allocation
 * Formula: (participantBurn * distributableDataCap) / totalBurn
 */
export function calculateExpectedAllocation(
  participantBurn: bigint,
  distributableDataCap: bigint,
  totalBurn: bigint
): bigint {
  if (totalBurn === 0n) return 0n;
  return (participantBurn * distributableDataCap) / totalBurn;
}

/**
 * Aggregate burn data per payee from rails
 */
export function aggregateBurnByPayee(rails: Rail[]): Map<string, bigint> {
  const burnMap = new Map<string, bigint>();

  for (const rail of rails) {
    const payeeAddress = rail.payee?.address?.toLowerCase();
    if (!payeeAddress) continue;
    
    let existingBurn = burnMap.get(payeeAddress) || 0n;

    for (const settlement of rail.settlements || []) {
      existingBurn += BigInt(settlement.filBurned);
    }

    burnMap.set(payeeAddress, existingBurn);
  }

  return burnMap;
}

/**
 * Calculate total burn from aggregated map
 */
export function calculateTotalFromMap(burnMap: Map<string, bigint>): bigint {
  let total = 0n;
  for (const burn of burnMap.values()) {
    total += burn;
  }
  return total;
}

