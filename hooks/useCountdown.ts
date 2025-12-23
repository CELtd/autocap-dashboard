"use client";

import { useState, useEffect } from "react";
import { getCurrentTimestamp } from "@/lib/utils/format";

interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

/**
 * Hook to calculate countdown to a target timestamp
 * Updates every second
 */
export function useCountdown(targetTimestamp: number | undefined): CountdownResult | null {
  const [now, setNow] = useState(getCurrentTimestamp);

  useEffect(() => {
    if (!targetTimestamp) return;

    // Update every second
    const interval = setInterval(() => {
      setNow(getCurrentTimestamp());
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTimestamp]);

  if (!targetTimestamp) return null;

  const diff = targetTimestamp - now;

  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
    };
  }

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
  };
}

/**
 * Format countdown result as human-readable string
 */
export function formatCountdown(countdown: CountdownResult | null): string {
  if (!countdown) return "--";
  if (countdown.isExpired) return "Ended";

  const parts: string[] = [];
  if (countdown.days > 0) parts.push(`${countdown.days}d`);
  if (countdown.hours > 0) parts.push(`${countdown.hours}h`);
  if (countdown.minutes > 0) parts.push(`${countdown.minutes}m`);
  if (countdown.seconds > 0 || parts.length === 0) parts.push(`${countdown.seconds}s`);

  return parts.join(" ");
}

