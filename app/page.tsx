"use client";

import { RoundInfo } from "@/components/dashboard/RoundInfo";
import { RoundSelector } from "@/components/dashboard/RoundSelector";
import { ParticipantTable } from "@/components/dashboard/ParticipantTable";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useDashboard } from "@/hooks/useDashboard";
import { RoundStatus } from "@/types";
import { config } from "@/lib/constants";

export default function Dashboard() {
  const {
    currentRoundId,
    selectedRoundId,
    setSelectedRoundId,
    selectedRound,
    allRounds,
    participants,
    totalBurned,
    isLoading,
    error,
  } = useDashboard();

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-end mb-4">
            <ThemeToggle />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-4">AutoCap Dashboard</h1>

            {/* Round Selector */}
            <RoundSelector
              rounds={allRounds}
              selectedRoundId={selectedRoundId}
              currentRoundId={currentRoundId}
              onSelectRound={setSelectedRoundId}
              isLoading={isLoading && allRounds.length === 0}
            />
          </div>
        </div>

        {error ? (
          <div className="border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950 p-6">
            <p className="text-red-600 dark:text-red-400 font-medium mb-2">Connection Error</p>
            <p className="text-red-500 dark:text-red-400 text-sm mb-2 font-mono break-all">{error.message}</p>
            <div className="mt-4 text-xs text-red-600 dark:text-red-400 space-y-1">
              <p>Contract: {config.autoCapAddress}</p>
              <p>RPC: {config.rpcUrl}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Round Info Boxes */}
            <RoundInfo
              round={selectedRound}
              totalBurned={totalBurned}
              isLoading={isLoading}
            />

            {/* Participants Table */}
            <ParticipantTable
              participants={participants}
              roundStatus={selectedRound?.status ?? RoundStatus.Upcoming}
              isLoading={isLoading}
            />
          </>
        )}
      </div>
    </main>
  );
}
