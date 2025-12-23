import { FILECOIN_GENESIS, SECONDS_PER_EPOCH } from "../constants";

/**
 * Truncate an address for display (e.g., 0x1234...5678)
 */
export function truncateAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format actor ID with f0 prefix
 */
export function formatActorId(actorId: bigint | number): string {
  return `f0${actorId}`;
}

/**
 * Format DataCap bytes to human readable format
 * @param datacapWithDecimals - DataCap value with 18 decimals (like FIL, needs to be divided by 10^18 to get bytes)
 * @param decimals - Number of decimal places to show
 */
const UNITS = ["Bytes", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB"];
const DATACAP_DECIMALS = 18n;
const DATACAP_DIVISOR = 10n ** DATACAP_DECIMALS;

export function formatDataCap(datacapWithDecimals: bigint, decimals = 2): string {
  if (datacapWithDecimals === 0n) return "0 Bytes";

  // Convert from 18-decimal format to actual bytes
  // Divide by 10^18 to get bytes value
  const bytes = datacapWithDecimals / DATACAP_DIVISOR;

  if (bytes === 0n) return "0 Bytes";

  const bytesNum = Number(bytes);
  let unitIndex = 0;
  let value = bytesNum;

  while (value >= 1024 && unitIndex < UNITS.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(decimals)} ${UNITS[unitIndex]}`;
}

/**
 * Format DataCap with short unit (for table display)
 * @param datacapWithDecimals - DataCap value with 18 decimals (like FIL, needs to be divided by 10^18 to get bytes)
 * @param decimals - Number of decimal places to show
 */
export function formatDataCapShort(datacapWithDecimals: bigint, decimals = 2): { value: number; unit: string } {
  if (datacapWithDecimals === 0n) return { value: 0, unit: "Bytes" };

  // Convert from 18-decimal format to actual bytes
  const bytes = datacapWithDecimals / DATACAP_DIVISOR;

  if (bytes === 0n) return { value: 0, unit: "Bytes" };

  const bytesNum = Number(bytes);
  let unitIndex = 0;
  let value = bytesNum;

  while (value >= 1024 && unitIndex < UNITS.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return { value: Number(value.toFixed(decimals)), unit: UNITS[unitIndex] };
}

/**
 * Convert DataCap from 18-decimal format to bytes
 * @param datacapWithDecimals - DataCap value with 18 decimals
 * @returns Actual bytes value
 */
export function datacapToBytes(datacapWithDecimals: bigint): bigint {
  return datacapWithDecimals / DATACAP_DIVISOR;
}

/**
 * Result of formatting FIL with unit information
 */
export interface FilFormatResult {
  formatted: string;
  fullUnitName: string;
  needsTooltip: boolean;
}

/**
 * Core FIL formatting logic - unified for all use cases
 * Shows FIL if >= 0.0001 (4 decimals), otherwise uses smaller units
 * 
 * Unit conversions:
 * - 1 FIL = 1e18 attoFIL
 * - 1 nanoFIL (nFIL) = 1e9 attoFIL
 * - 1 picoFIL (pFIL) = 1e6 attoFIL
 * - 1 femtoFIL (fFIL) = 1e3 attoFIL
 */
function formatFilCore(attoFil: bigint, decimals = 4): FilFormatResult {
  if (attoFil === 0n) {
    return { formatted: "0 FIL", fullUnitName: "FIL", needsTooltip: false };
  }

  const fil = Number(attoFil) / 1e18;

  // If >= 0.0001 FIL (4 decimals default) AND doesn't round to 0 at requested precision
  const minVisible = 1 / Math.pow(10, decimals);
  if (fil >= 0.0001 && fil >= minVisible) {
    return {
      formatted: `${fil.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })} FIL`,
      fullUnitName: "FIL",
      needsTooltip: false,
    };
  }

  // For values < 0.0001 FIL, use smaller units
  const nanoFil = Number(attoFil) / 1e9;
  if (nanoFil >= 1) {
    return {
      formatted: `${nanoFil.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} nFIL`,
      fullUnitName: "nanoFIL",
      needsTooltip: true,
    };
  }

  if (nanoFil >= 0.001) {
    const precision = Math.ceil(-Math.log10(nanoFil)) + 1;
    return {
      formatted: `${nanoFil.toFixed(Math.min(precision, 6))} nFIL`,
      fullUnitName: "nanoFIL",
      needsTooltip: true,
    };
  }

  const picoFil = Number(attoFil) / 1e6;
  if (picoFil >= 1) {
    return {
      formatted: `${picoFil.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} pFIL`,
      fullUnitName: "picoFIL",
      needsTooltip: true,
    };
  }

  if (picoFil >= 0.001) {
    const precision = Math.ceil(-Math.log10(picoFil)) + 1;
    return {
      formatted: `${picoFil.toFixed(Math.min(precision, 6))} pFIL`,
      fullUnitName: "picoFIL",
      needsTooltip: true,
    };
  }

  const femtoFil = Number(attoFil) / 1e3;
  if (femtoFil >= 1) {
    return {
      formatted: `${femtoFil.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} fFIL`,
      fullUnitName: "femtoFIL",
      needsTooltip: true,
    };
  }

  if (femtoFil >= 0.001) {
    const precision = Math.ceil(-Math.log10(femtoFil)) + 1;
    return {
      formatted: `${femtoFil.toFixed(Math.min(precision, 6))} fFIL`,
      fullUnitName: "femtoFIL",
      needsTooltip: true,
    };
  }

  // For extremely small values, show attoFIL directly
  return {
    formatted: `${attoFil.toString()} aFIL`,
    fullUnitName: "attoFIL",
    needsTooltip: true,
  };
}

/**
 * Format attoFIL to FIL with smart precision and return unit info
 * Uses unified formatting logic: FIL if >= 0.0001, otherwise smaller units
 */
export function formatFilWithUnit(attoFil: bigint, decimals = 4): FilFormatResult {
  return formatFilCore(attoFil, decimals);
}

/**
 * Format attoFIL to FIL with smart precision
 * Uses unified formatting logic: FIL if >= 0.0001, otherwise smaller units
 */
export function formatFil(attoFil: bigint, decimals = 4): string {
  return formatFilCore(attoFil, decimals).formatted;
}

/**
 * Get FIL value as number (for animations)
 */
export function getFilValue(attoFil: bigint): number {
  return Number(attoFil) / 1e18;
}

/**
 * Convert Unix timestamp (seconds) to Date object
 */
export function timestampToDate(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

/**
 * Format Unix timestamp to human-readable date string
 */
export function formatTimestamp(timestamp: number): string {
  const date = timestampToDate(timestamp);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/**
 * Format a number with commas
 */
export function formatNumber(num: number | bigint, decimals = 0): string {
  const value = typeof num === "bigint" ? Number(num) : num;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Convert Unix timestamp to Filecoin epoch (approximate)
 */
export function timestampToEpoch(timestamp: number): number {
  const genesisTimestamp = Math.floor(FILECOIN_GENESIS.getTime() / 1000);
  return Math.floor((timestamp - genesisTimestamp) / SECONDS_PER_EPOCH);
}

/**
 * Get current Unix timestamp in seconds
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}
