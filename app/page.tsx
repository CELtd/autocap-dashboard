"use client";

import { RoundInfo } from "@/components/dashboard/RoundInfo";
import { RoundSelector } from "@/components/dashboard/RoundSelector";
import { ParticipantTable } from "@/components/dashboard/ParticipantTable";
import { useDashboard } from "@/hooks/useDashboard";
import { RoundStatus } from "@/types";
import { config } from "@/lib/constants";
import { useState } from "react";
import { RegisterModal } from "@/components/dashboard/RegisterModal";

export default function Dashboard() {
  const [showRegisterModal, setShowRegisterModal] = useState(false);
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
    <main className="flex-grow bg-gray-50 dark:bg-gray-950 py-8 transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4">
        {/* Round Selector Section */}
        <div className="mb-10 text-center">
          <RoundSelector
            rounds={allRounds}
            selectedRoundId={selectedRoundId}
            currentRoundId={currentRoundId}
            onSelectRound={setSelectedRoundId}
            isLoading={isLoading && allRounds.length === 0}
          />
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
              onRegister={() => setShowRegisterModal(true)}
            />

            {selectedRound && (
              <RegisterModal
                isOpen={showRegisterModal}
                onClose={() => setShowRegisterModal(false)}
                roundId={selectedRound.id}
                registrationFee={selectedRound.registrationFee}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}
