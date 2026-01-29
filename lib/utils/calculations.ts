import type { Settlement, OneTimePayment, SubgraphResponse } from "@/types";

/**
 * Sum all fee values from settlements and one-time payments
 * For native FIL rails, fee = FIL burned
 */
export function calculateTotalBurn(data: SubgraphResponse): bigint {
  let total = 0n;

  // Sum fees from settlements
  for (const settlement of data.settlements || []) {
    total += BigInt(settlement.fee);
  }

  // Sum fees from one-time payments
  for (const payment of data.oneTimePayments || []) {
    total += BigInt(payment.fee);
  }

  return total;
}

/**
 * Calculate burn for a specific payee from settlements and one-time payments
 */
export function calculatePayeeBurn(data: SubgraphResponse, payee: string): bigint {
  const payeeLower = payee.toLowerCase();
  let total = 0n;

  // Sum fees from settlements for this payee
  for (const settlement of data.settlements || []) {
    if (settlement.rail?.payee?.address?.toLowerCase() === payeeLower) {
      total += BigInt(settlement.fee);
    }
  }

  // Sum fees from one-time payments for this payee
  for (const payment of data.oneTimePayments || []) {
    if (payment.rail?.payee?.address?.toLowerCase() === payeeLower) {
      total += BigInt(payment.fee);
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
 * Aggregate burn data per payee from settlements and one-time payments
 * For native FIL rails, fee = FIL burned
 */
export function aggregateBurnByPayee(data: SubgraphResponse): Map<string, bigint> {
  const burnMap = new Map<string, bigint>();

  // Process settlements
  for (const settlement of data.settlements || []) {
    const payeeAddress = settlement.rail?.payee?.address?.toLowerCase();
    if (!payeeAddress) continue;

    const existingBurn = burnMap.get(payeeAddress) || 0n;
    burnMap.set(payeeAddress, existingBurn + BigInt(settlement.fee));
  }

  // Process one-time payments
  for (const payment of data.oneTimePayments || []) {
    const payeeAddress = payment.rail?.payee?.address?.toLowerCase();
    if (!payeeAddress) continue;

    const existingBurn = burnMap.get(payeeAddress) || 0n;
    burnMap.set(payeeAddress, existingBurn + BigInt(payment.fee));
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
