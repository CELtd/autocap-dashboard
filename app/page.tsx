"use client";

import { RoundInfo } from "@/components/dashboard/RoundInfo";
import { RoundSelector } from "@/components/dashboard/RoundSelector";
import { ParticipantTable } from "@/components/dashboard/ParticipantTable";
import { useDashboard } from "@/hooks/useDashboard";
import { RoundStatus } from "@/types";
import { config, MIN_DATACAP_ALLOCATION } from "@/lib/constants";
import { useState } from "react";
import { RegisterModal } from "@/components/dashboard/RegisterModal";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

export default function Dashboard() {
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isMinAllocationExpanded, setIsMinAllocationExpanded] = useState(false);
  const [isFilEligibilityExpanded, setIsFilEligibilityExpanded] = useState(false);
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

  const toggleMinAllocation = () => {
    setIsMinAllocationExpanded(!isMinAllocationExpanded);
  };

  const toggleFilEligibility = () => {
    setIsFilEligibilityExpanded(!isFilEligibilityExpanded);
  };

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

            {/* FIL Eligibility Warning - Expandable */}
            <div className="my-6 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-600 rounded-lg overflow-hidden">
              <button
                onClick={toggleFilEligibility}
                className="w-full p-4 flex items-start gap-3 hover:bg-amber-100 dark:hover:bg-amber-800/30 transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                    Important: Only Rails Denominated in FIL are eligible for DC allocation
                  </p>
                </div>
                {isFilEligibilityExpanded ? (
                  <ChevronUp className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                )}
              </button>
              {isFilEligibilityExpanded && (
                <div className="px-4 pb-4 pl-12">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Rails that are denominated in other tokens (USFDC, ...) are currently not eligible for DC via Autocap.
                  </p>
                </div>
              )}
            </div>

            {/* Minimum Allocation Warning - Expandable */}
            <div className="my-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
              <button
                onClick={toggleMinAllocation}
                className="w-full p-4 flex items-start gap-3 hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Minimum Allocation: 1 MiB ({MIN_DATACAP_ALLOCATION.toLocaleString()} bytes)
                  </p>
                </div>
                {isMinAllocationExpanded ? (
                  <ChevronUp className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                )}
              </button>
              {isMinAllocationExpanded && (
                <div className="px-4 pb-4 pl-12">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Participants with allocations below 1 MiB will not receive DataCap as this is the minimum enforced by the Filecoin Verified Registry.
                  </p>
                </div>
              )}
            </div>

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
