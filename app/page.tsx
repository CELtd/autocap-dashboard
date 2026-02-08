"use client";

import { RoundInfo } from "@/components/dashboard/RoundInfo";
import { RoundSelector } from "@/components/dashboard/RoundSelector";
import { ParticipantTable } from "@/components/dashboard/ParticipantTable";
import { useDashboard } from "@/hooks/useDashboard";
import { RoundStatus } from "@/types";
import { config, MIN_DATACAP_ALLOCATION, BASE_URL } from "@/lib/constants";
import { useState } from "react";
import { RegisterModal } from "@/components/dashboard/RegisterModal";
import { AlertTriangle, X } from "lucide-react";

export default function Dashboard() {
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showFilNotice, setShowFilNotice] = useState(true);
  const [showMinAllocNotice, setShowMinAllocNotice] = useState(true);
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

            {/* FIL Eligibility Notice */}
            {showFilNotice && (
              <div className="my-6 p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-600 rounded-lg flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <a
                  href={`${BASE_URL}/docs/phase-2-activity`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-sm font-semibold text-amber-900 dark:text-amber-100 hover:underline"
                >
                  Important: Filecoin Pay rails denominated in FIL token ONLY are eligible for DC allocation via Autocap.
                </a>
                <button onClick={() => setShowFilNotice(false)} className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Minimum Allocation Notice */}
            {showMinAllocNotice && (
              <div className="my-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <a
                  href={`${BASE_URL}/docs/phase-3-allocation`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-sm font-medium text-blue-800 dark:text-blue-200 hover:underline"
                >
                  Minimum Allocation: 1 MiB ({MIN_DATACAP_ALLOCATION.toLocaleString("en-US")} bytes)
                </a>
                <button onClick={() => setShowMinAllocNotice(false)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

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
