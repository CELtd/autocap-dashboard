"use client";

import { RoundStatus, type Round } from "@/types";
import { FilDisplay } from "@/components/ui/FilDisplay";
import { formatDataCap, formatFil } from "@/lib/utils/format";
import { useCountdown, formatCountdown } from "@/hooks/useCountdown";

interface RoundInfoProps {
  round: Round | undefined;
  totalBurned: bigint;
  isLoading?: boolean;
}

const statusConfig: Record<RoundStatus, { label: string; dotColor: string }> = {
  [RoundStatus.Upcoming]: { label: "Upcoming", dotColor: "bg-yellow-500" },
  [RoundStatus.Open]: { label: "Open", dotColor: "bg-green-500" },
  [RoundStatus.Closed]: { label: "Closed", dotColor: "bg-gray-400 dark:bg-gray-500" },
};

function InfoBox({ label, children, isLoading }: { label: string; children: React.ReactNode; isLoading?: boolean }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900 transition-colors duration-200">
      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{label}</div>
      <div className="text-gray-900 dark:text-gray-100">
        {isLoading ? (
          <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export function RoundInfo({ round, totalBurned, isLoading }: RoundInfoProps) {
  const status = round ? statusConfig[round.status] : statusConfig[RoundStatus.Upcoming];

  // Determine target timestamp for countdown
  const targetTimestamp =
    round?.status === RoundStatus.Upcoming
      ? round.startTime
      : round?.status === RoundStatus.Open
        ? round.endTime
        : undefined;

  const countdown = useCountdown(targetTimestamp);
  const countdownText = formatCountdown(countdown);

  // Determine countdown label
  const countdownLabel =
    round?.status === RoundStatus.Upcoming
      ? "Starts In"
      : round?.status === RoundStatus.Open
        ? "Ends In"
        : "Status";

  return (
    <div className="space-y-4 mb-6">
      {/* Row 1: Status, Countdown, Participants */}
      <div className="grid grid-cols-3 gap-4">
        <InfoBox label="Round Status" isLoading={isLoading}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${status.dotColor}`} />
            <span className="font-medium">{status.label}</span>
          </div>
        </InfoBox>

        <InfoBox label={countdownLabel} isLoading={isLoading}>
          {round && (
            <div className="font-mono font-semibold text-lg">
              {round.status === RoundStatus.Closed ? (
                <span className="text-gray-500 dark:text-gray-400">Ended</span>
              ) : (
                <span className="text-gray-900 dark:text-gray-100">{countdownText}</span>
              )}
            </div>
          )}
        </InfoBox>

        <InfoBox label="Participants" isLoading={isLoading}>
          <div className="text-2xl font-semibold">{round?.participantCount ?? 0}</div>
        </InfoBox>
      </div>

      {/* Row 2: Round DataCap, Registration Fee, Total FIL Burned */}
      <div className="grid grid-cols-3 gap-4">
        <InfoBox label="Round DataCap" isLoading={isLoading}>
          <div className="text-2xl font-semibold">
            {round ? formatDataCap(round.totalDatacap) : "0 Bytes"}
          </div>
        </InfoBox>

        <InfoBox label="Registration Fee" isLoading={isLoading}>
          <div className="text-2xl font-semibold">
            {round ? formatFil(round.registrationFee, 2) : "0 FIL"}
          </div>
        </InfoBox>

        <InfoBox label="Total FIL Burned" isLoading={isLoading}>
          <div className="text-2xl font-semibold">
            <FilDisplay attoFil={totalBurned} decimals={4} />
          </div>
        </InfoBox>
      </div>
    </div>
  );
}
