"use client";

import { useState, useRef, useEffect } from "react";
import { RoundStatus, type Round } from "@/types";

interface RoundSelectorProps {
  rounds: Round[];
  selectedRoundId: number | undefined;
  currentRoundId: number | undefined;
  onSelectRound: (roundId: number) => void;
  isLoading?: boolean;
}

export function RoundSelector({
  rounds,
  selectedRoundId,
  currentRoundId,
  onSelectRound,
  isLoading,
}: RoundSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        <div className="h-4 w-4 border-2 border-gray-300 dark:border-gray-600 border-t-gray-600 dark:border-t-gray-300 rounded-full animate-spin" />
        <span className="text-gray-500 dark:text-gray-400 text-sm">Loading rounds...</span>
      </div>
    );
  }

  if (rounds.length === 0) {
    return null;
  }

  const isCurrentRound = selectedRoundId === currentRoundId;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Selected Round Display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
      >
        <div className="flex items-center gap-2 flex-1">
          <span className="font-semibold text-gray-900 dark:text-gray-100">Round #{selectedRoundId}</span>
          {isCurrentRound && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
              Current
            </span>
          )}
        </div>
        <svg
          className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-auto">
          {rounds.map((round) => {
            const isSelected = round.id === selectedRoundId;
            const isCurrent = round.id === currentRoundId;

            return (
              <button
                key={round.id}
                type="button"
                onClick={() => {
                  onSelectRound(round.id);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150 ${
                  isSelected ? "bg-gray-50 dark:bg-gray-800 font-medium" : ""
                } ${round.id !== rounds[rounds.length - 1].id ? "border-b border-b-gray-100 dark:border-b-gray-800" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`${isSelected ? "text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"}`}>
                      Round #{round.id}
                    </span>
                    {isCurrent && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
