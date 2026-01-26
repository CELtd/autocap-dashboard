"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useSafeDistribution } from "@/hooks/useSafeDistribution";
import { formatDataCap } from "@/lib/utils/format";
import { SAFE_ADDRESS, METAALLOCATOR_ADDRESS, MIN_DATACAP_ALLOCATION } from "@/lib/constants";
import { Loader2, AlertTriangle, CheckCircle, ExternalLink, FlaskConical, XCircle, ShieldX, X } from "lucide-react";

const PROPOSED_ROUNDS_STORAGE_KEY = "autocap-proposed-rounds";

interface ProposedRound {
  roundId: number;
  safeTxHash: string;
  proposedAt: string;
}

function getProposedRounds(): ProposedRound[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(PROPOSED_ROUNDS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveProposedRound(roundId: number, safeTxHash: string): void {
  if (typeof window === "undefined") return;
  try {
    const rounds = getProposedRounds();
    // Check if already saved
    if (rounds.some((r) => r.roundId === roundId)) return;
    rounds.push({
      roundId,
      safeTxHash,
      proposedAt: new Date().toISOString(),
    });
    localStorage.setItem(PROPOSED_ROUNDS_STORAGE_KEY, JSON.stringify(rounds));
  } catch {
    // Ignore localStorage errors
  }
}

function checkRoundProposed(roundId: number): ProposedRound | null {
  const rounds = getProposedRounds();
  return rounds.find((r) => r.roundId === roundId) || null;
}

type AccessStatus = "checking" | "verified" | "allowed" | "denied" | "not_connected";

async function checkDistributorAccess(wallet: string): Promise<boolean> {
  try {
    const response = await fetch("/api/check-distributor-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    });
    const data = await response.json();
    return data.allowed === true;
  } catch {
    return false;
  }
}

export default function DistributePage() {
  const { isConnected, address } = useAccount();
  const {
    status,
    error,
    distributionData,
    safeTxHash,
    fetchDistribution,
    proposeDistribution,
    reset,
  } = useSafeDistribution();

  const [accessStatus, setAccessStatus] = useState<AccessStatus>("not_connected");
  const [hasConfirmedConnection, setHasConfirmedConnection] = useState(false);
  const [previousProposal, setPreviousProposal] = useState<ProposedRound | null>(null);
  const [isWarningDismissed, setIsWarningDismissed] = useState(false);

  const handleDismissWarning = () => {
    setIsWarningDismissed(true);
  };

  // Check access when wallet connects/changes AND user has confirmed
  useEffect(() => {
    if (!hasConfirmedConnection) {
      setAccessStatus("not_connected");
      return;
    }

    if (!isConnected || !address) {
      setAccessStatus("not_connected");
      setHasConfirmedConnection(false);
      return;
    }

    setAccessStatus("checking");
    checkDistributorAccess(address).then((allowed) => {
      if (allowed) {
        setAccessStatus("verified");
        // Show "verified" message briefly, then transition to "allowed"
        setTimeout(() => {
          setAccessStatus("allowed");
        }, 1500);
      } else {
        setAccessStatus("denied");
      }
    });
  }, [isConnected, address, hasConfirmedConnection]);

  // Handle the "Enter" button click
  const handleEnterClick = useCallback(() => {
    if (isConnected && address) {
      setHasConfirmedConnection(true);
    }
  }, [isConnected, address]);

  // Fetch distribution data only when access is allowed
  useEffect(() => {
    if (accessStatus === "allowed") {
      fetchDistribution();
    }
  }, [accessStatus, fetchDistribution]);

  // Check if this round was already proposed
  useEffect(() => {
    if (distributionData?.roundId) {
      const prev = checkRoundProposed(distributionData.roundId);
      setPreviousProposal(prev);
    }
  }, [distributionData?.roundId]);

  // Save to localStorage when proposal succeeds
  useEffect(() => {
    if (status === "success" && safeTxHash && distributionData?.roundId) {
      saveProposedRound(distributionData.roundId, safeTxHash);
      setPreviousProposal({
        roundId: distributionData.roundId,
        safeTxHash,
        proposedAt: new Date().toISOString(),
      });
    }
  }, [status, safeTxHash, distributionData?.roundId]);

  const isLoading = status === "fetching";
  const isProposing = ["building", "signing", "proposing"].includes(status);
  const isSuccess = status === "success";
  const isError = status === "error";
  const showLatestRoundWarning =
    distributionData &&
    distributionData.latestRoundStatus !== "closed" &&
    distributionData.latestRoundId !== distributionData.roundId;

  // Access Denied Screen
  if (accessStatus === "denied") {
    return (
      <main className="flex-grow bg-gray-50 dark:bg-gray-950 py-8 transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8 text-center max-w-md">
              <ShieldX className="w-16 h-16 text-red-500 dark:text-red-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-red-700 dark:text-red-300 mb-2">
                Access Denied
              </h1>
              <p className="text-red-600 dark:text-red-400 mb-4">
                Your wallet is not authorized to access this page.
              </p>
              <p className="text-sm text-red-500 dark:text-red-500 font-mono break-all">
                {address}
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Connect Wallet Screen
  if (accessStatus === "not_connected") {
    return (
      <main className="flex-grow bg-gray-50 dark:bg-gray-950 py-8 transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center max-w-md">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                DataCap Distribution
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {isConnected
                  ? "Click below to verify your access to this page."
                  : "Connect your wallet to access this page. Only authorized wallets can view and execute distributions."
                }
              </p>
              <div className="flex justify-center">
                {isConnected ? (
                  <button
                    onClick={handleEnterClick}
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Verify Access
                  </button>
                ) : (
                  <ConnectButton />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Checking Access Screen
  if (accessStatus === "checking") {
    return (
      <main className="flex-grow bg-gray-50 dark:bg-gray-950 py-8 transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Verifying access...</p>
          </div>
        </div>
      </main>
    );
  }

  // Verification Passed Screen
  if (accessStatus === "verified") {
    return (
      <main className="flex-grow bg-gray-50 dark:bg-gray-950 py-8 transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-8 text-center max-w-md">
              <CheckCircle className="w-16 h-16 text-green-500 dark:text-green-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-green-700 dark:text-green-300 mb-2">
                Verification Passed
              </h1>
              <p className="text-green-600 dark:text-green-400">
                Access granted. Loading distribution page...
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-grow bg-gray-50 dark:bg-gray-950 py-8 transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            DataCap Distribution
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Distribute DataCap to participants of the latest closed round via Safe multisig.
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Safe Address</p>
            <p className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">
              {SAFE_ADDRESS}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">MetaAllocator</p>
            <p className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">
              {METAALLOCATOR_ADDRESS}
            </p>
          </div>
        </div>

        {/* Warning about minimum allocation */}
        {!isWarningDismissed && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg relative">
            <button
              onClick={handleDismissWarning}
              className="absolute top-2 right-2 p-1 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-800/50 rounded transition-colors"
              aria-label="Dismiss warning"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3 pr-6">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Minimum Allocation: 1 MiB ({MIN_DATACAP_ALLOCATION.toLocaleString()} bytes)
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Allocations below 1 MiB will be skipped as they would revert on-chain.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Latest round not closed warning */}
        {distributionData && showLatestRoundWarning && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Round {distributionData.latestRoundId} is not finished yet.
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  You can propose distribution for the latest closed round (Round {distributionData.roundId}) while the current round is still active.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Already Proposed Warning */}
        {previousProposal && !isSuccess && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Round {previousProposal.roundId} Already Proposed
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  A transaction for this round was already proposed on{" "}
                  {new Date(previousProposal.proposedAt).toLocaleString()}.
                </p>
                <a
                  href={`https://safe.filecoin.io/transactions/queue?safe=fil:${SAFE_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-amber-600 dark:text-amber-400 hover:underline mt-2 inline-flex items-center gap-1"
                >
                  View in Safe UI
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading distribution data...</p>
          </div>
        )}

        {/* Error State */}
        {isError && error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
            <p className="text-red-700 dark:text-red-300 font-medium mb-2">Error</p>
            <p className="text-red-600 dark:text-red-400 text-sm">{error.message}</p>
            <button
              onClick={() => {
                reset();
                fetchDistribution();
              }}
              className="mt-4 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Success State */}
        {isSuccess && safeTxHash && (
          <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg p-8 mb-6">
            <div className="text-center mb-6">
              <CheckCircle className="w-16 h-16 text-green-500 dark:text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-700 dark:text-green-300 mb-2">
                Transaction Proposed!
              </h2>
              <p className="text-green-600 dark:text-green-400">
                The distribution transaction has been signed and proposed to the Safe.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Safe Transaction Hash:</p>
              <p className="font-mono text-sm text-green-700 dark:text-green-300 break-all">
                {safeTxHash}
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                <strong>Next Steps:</strong>
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                Other Safe owners need to sign this transaction before it can be executed.
                Go to the Safe UI to collect signatures and execute.
              </p>
              <a
                href={`https://safe.filecoin.io/transactions/queue?safe=fil:${SAFE_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Open Safe UI
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => {
                  reset();
                  fetchDistribution();
                }}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Propose Another Transaction
              </button>
            </div>
          </div>
        )}

        {/* Distribution Data */}
        {distributionData && !isSuccess && (
          <>
            {/* Test Mode Warnings */}
            {(distributionData.testMode || distributionData.testOverrideActorId || distributionData.testInjectExtraWinner) && (
              <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <FlaskConical className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                      Test Mode Enabled
                    </p>
                    {distributionData.testMode && (
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        <strong>Amount Override:</strong> All allocations are set to 1 MiB ({MIN_DATACAP_ALLOCATION.toLocaleString()} bytes).
                      </p>
                    )}
                    {distributionData.testOverrideActorId && (
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        <strong>Actor ID Override:</strong> All recipients use actor ID{" "}
                        <code className="font-mono text-xs bg-purple-100 dark:bg-purple-900/50 px-1 py-0.5 rounded">
                          {distributionData.testOverrideActorId}
                        </code>.
                      </p>
                    )}
                    {distributionData.testInjectExtraWinner && (
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        <strong>Extra Winner Injected:</strong> A fake second winner has been added to test batch transactions.
                      </p>
                    )}
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                      This is for testing Safe transaction building and signing. Disable test flags for production.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Round Info */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Distributing Round {distributionData.roundId}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {distributionData.roundStatus}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Latest Round</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    #{distributionData.latestRoundId} ({distributionData.latestRoundStatus})
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Transactions</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {distributionData.transactions.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total to Distribute</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {formatDataCap(BigInt(distributionData.totalDatacapToDistribute) * BigInt(10 ** 18))}
                  </p>
                </div>
              </div>
            </div>

            {/* Transactions List */}
            {distributionData.transactions.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-6">
                <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Transactions to Execute ({distributionData.transactions.length})
                </h3>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {distributionData.transactions.map((tx, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          #{index + 1} addVerifiedClient
                        </span>
                        <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                          {formatDataCap(BigInt(tx.meta.allocatedDatacap) * BigInt(10 ** 18))}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Actor ID:</span>
                          <span className="font-mono text-gray-700 dark:text-gray-300">
                            {tx.meta.datacapActorId}
                          </span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Robust Address:</span>
                          <span className="font-mono text-gray-700 dark:text-gray-300 text-right break-all ml-2 text-xs">
                            {tx.meta.robustAddress}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Amount (bytes):</span>
                          <span className="font-mono text-gray-700 dark:text-gray-300">
                            {BigInt(tx.meta.allocatedDatacap).toLocaleString()}
                          </span>
                        </div>
                        {distributionData.testOverrideActorId && tx.meta.datacapActorIdOriginal !== tx.meta.datacapActorId && (
                          <div className="flex justify-between text-purple-600 dark:text-purple-400">
                            <span>Original Actor ID:</span>
                            <span className="font-mono">
                              {tx.meta.datacapActorIdOriginal}
                            </span>
                          </div>
                        )}
                        {distributionData.testMode && tx.meta.allocatedDatacapOriginal !== tx.meta.allocatedDatacap && (
                          <div className="flex justify-between text-purple-600 dark:text-purple-400">
                            <span>Original Amount:</span>
                            <span className="font-mono">
                              {BigInt(tx.meta.allocatedDatacapOriginal).toLocaleString()} bytes
                            </span>
                          </div>
                        )}
                      </div>

                      <details className="mt-3">
                        <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                          Show raw calldata
                        </summary>
                        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono break-all text-gray-600 dark:text-gray-400">
                          <p className="mb-1"><strong>To:</strong> {tx.to}</p>
                          <p className="mb-1"><strong>clientAddressBytes:</strong> {tx.meta.clientAddressBytes}</p>
                          <p><strong>Data:</strong> {tx.data}</p>
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skipped Allocations */}
            {distributionData.skipped.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-6">
                <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Skipped Allocations ({distributionData.skipped.length})
                </h3>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {distributionData.skipped.map((skipped, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono text-sm text-gray-700 dark:text-gray-300">
                            {skipped.datacapActorId}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {skipped.allocatedDatacap} bytes
                          </p>
                        </div>
                        <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded">
                          {skipped.reason}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Section */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              {distributionData.transactions.length === 0 ? (
                <div className="text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    No valid transactions to propose. All allocations were skipped.
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Sign and propose {distributionData.transactions.length} transaction(s) as a Safe batch.
                  </p>
                  <button
                    onClick={proposeDistribution}
                    disabled={isProposing}
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                  >
                    {isProposing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {status === "building" && "Building Transaction..."}
                        {status === "signing" && "Sign in Wallet..."}
                        {status === "proposing" && "Proposing to Safe..."}
                      </>
                    ) : (
                      "Sign & Propose"
                    )}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
