"use client";

import { formatFilWithUnit } from "@/lib/utils/format";

interface FilDisplayProps {
  attoFil: bigint;
  decimals?: number;
  className?: string;
}

/**
 * Component to display FIL values with tooltips for small units
 * Shows full unit name (e.g., "nanoFIL") in tooltip when hovering over abbreviated units (e.g., "nFIL")
 */
export function FilDisplay({ attoFil, decimals = 4, className = "" }: FilDisplayProps) {
  const { formatted, fullUnitName, needsTooltip } = formatFilWithUnit(attoFil, decimals);

  if (!needsTooltip) {
    return <span className={className}>{formatted}</span>;
  }

  return (
    <span
      className={`${className} cursor-help underline decoration-dotted decoration-gray-400 dark:decoration-gray-500`}
      title={`${fullUnitName} (1 ${fullUnitName} = ${getUnitDescription(fullUnitName)})`}
    >
      {formatted}
    </span>
  );
}

/**
 * Get description for unit conversion
 */
function getUnitDescription(unit: string): string {
  switch (unit) {
    case "nanoFIL":
      return "1e9 attoFIL";
    case "picoFIL":
      return "1e6 attoFIL";
    case "femtoFIL":
      return "1e3 attoFIL";
    case "attoFIL":
      return "1 attoFIL";
    default:
      return "";
  }
}

