"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { encodeFunctionData, formatEther, parseEther, type Address } from "viem";
import { useSafeAdmin } from "@/hooks/useSafeAdmin";
import { useSafeDistribution } from "@/hooks/useSafeDistribution";
import { autoCapAbi } from "@/lib/contracts/abi";
import { metaAllocatorAbi } from "@/lib/contracts/metaAllocatorAbi";
import { publicClient, autoCapContract } from "@/lib/contracts/config";
import { formatDataCap } from "@/lib/utils/format";
import { SAFE_ADDRESS, METAALLOCATOR_ADDRESS, MIN_DATACAP_ALLOCATION } from "@/lib/constants";
import {
  Loader2,
  CheckCircle,
  ExternalLink,
  ShieldX,
  Plus,
  Wallet,
  ArrowLeft,
  Send,
  AlertTriangle,
  FlaskConical,
  X,
  ChevronLeft,
  ChevronRight,
  StopCircle,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

type AccessStatus = "checking" | "verified" | "allowed" | "denied" | "not_connected";
type ActiveTab = "create-round" | "close-round" | "withdraw-fees" | "distribute";
type DataCapUnit = "GiB" | "TiB" | "PiB";

interface CreateRoundForm {
  startDate: string;     // "YYYY-MM-DD"
  startHour: string;     // "0"-"23"
  startMinute: string;   // "0"-"59"
  endDate: string;
  endHour: string;
  endMinute: string;
  registrationFee: string;
  totalDatacap: string;
  datacapUnit: DataCapUnit;
}

// ============================================================================
// Constants
// ============================================================================

const HOURS = Array.from({ length: 24 }, (_, i) => String(i));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i));

const DATACAP_DECIMALS = 10n ** 18n;

// Contract stores totalDatacap with 18 decimals (like FIL wei)
// So 1 TiB = 2^40 bytes * 10^18 = 1099511627776000000000000000000
const DATACAP_MULTIPLIERS: Record<DataCapUnit, bigint> = {
  GiB: 1073741824n * DATACAP_DECIMALS,        // 2^30 * 10^18
  TiB: 1099511627776n * DATACAP_DECIMALS,     // 2^40 * 10^18
  PiB: 1125899906842624n * DATACAP_DECIMALS,  // 2^50 * 10^18
};

// ============================================================================
// Helpers
// ============================================================================

async function checkAdminAccess(wallet: string): Promise<boolean> {
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

function datePartsToTimestamp(date: string, hour: string, minute: string): number {
  if (!date) return 0;
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return 0;
  const h = parseInt(hour, 10) || 0;
  const m = parseInt(minute, 10) || 0;
  return Math.floor(Date.UTC(year, month - 1, day, h, m) / 1000);
}

function formatTimestampUTC(ts: number): string {
  if (!ts) return "—";
  const d = new Date(ts * 1000);
  return d.toISOString().replace("T", " ").replace(/:\d{2}\.\d{3}Z$/, " UTC");
}

function durationDays(startTs: number, endTs: number): string {
  if (!startTs || !endTs || endTs <= startTs) return "—";
  const days = (endTs - startTs) / 86400;
  if (days < 1) return `${((endTs - startTs) / 3600).toFixed(1)} hours`;
  return `${days.toFixed(1)} days`;
}

function datacapToDisplay(datacapWith18Decimals: bigint): string {
  if (datacapWith18Decimals === 0n) return "0 Bytes";
  // Strip 18 decimals to get actual bytes
  const bytes = datacapWith18Decimals / DATACAP_DECIMALS;
  if (bytes === 0n) return "< 1 Byte";
  const units = ["Bytes", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB"];
  let value = Number(bytes);
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  // Use enough decimals to avoid precision loss on round-trip
  const decimals = value % 1 === 0 ? 0 : 4;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

// ============================================================================
// Access Control Screens (reused pattern from /distribute)
// ============================================================================

function AccessDeniedScreen({ address }: { address?: string }) {
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
            {address && (
              <p className="text-sm text-red-500 dark:text-red-500 font-mono break-all">
                {address}
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function ConnectWalletScreen({
  isConnected,
  onEnter,
}: {
  isConnected: boolean;
  onEnter: () => void;
}) {
  return (
    <main className="flex-grow bg-gray-50 dark:bg-gray-950 py-8 transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center max-w-md">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Admin Panel
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {isConnected
                ? "Click below to verify your admin access."
                : "Connect your wallet to access admin functions. Only authorized wallets can create rounds and manage fees."}
            </p>
            <div className="flex justify-center">
              {isConnected ? (
                <button
                  onClick={onEnter}
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

function CheckingScreen() {
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

function VerifiedScreen() {
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
              Access granted. Loading admin panel...
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

// ============================================================================
// Success Screen
// ============================================================================

function SuccessScreen({
  safeTxHash,
  message,
  onReset,
}: {
  safeTxHash: string;
  message: string;
  onReset: () => void;
}) {
  return (
    <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg p-8 mb-6">
      <div className="text-center mb-6">
        <CheckCircle className="w-16 h-16 text-green-500 dark:text-green-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-green-700 dark:text-green-300 mb-2">
          Transaction Proposed!
        </h2>
        <p className="text-green-600 dark:text-green-400">{message}</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          Safe Transaction Hash:
        </p>
        <p className="font-mono text-sm text-green-700 dark:text-green-300 break-all">
          {safeTxHash}
        </p>
      </div>
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
          <strong>Next Steps:</strong>
        </p>
        <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
          Other Safe owners need to sign this transaction before it can be
          executed. Go to the Safe UI to collect signatures and execute.
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
          onClick={onReset}
          className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Back to Admin
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Create Round Section
// ============================================================================

function CreateRoundSection() {
  const { status, error, safeTxHash, propose, reset } = useSafeAdmin();

  const [form, setForm] = useState<CreateRoundForm>({
    startDate: "",
    startHour: "0",
    startMinute: "0",
    endDate: "",
    endHour: "0",
    endMinute: "0",
    registrationFee: "0.1",
    totalDatacap: "1000",
    datacapUnit: "TiB",
  });
  const [isReviewing, setIsReviewing] = useState(false);
  const [currentRoundId, setCurrentRoundId] = useState<number | null>(null);

  // Today's date in YYYY-MM-DD (UTC) for date picker min
  const todayUTC = new Date().toISOString().split("T")[0];

  // Fetch current round ID for display
  useEffect(() => {
    publicClient
      .readContract({
        ...autoCapContract,
        functionName: "currentRoundId",
      })
      .then((id) => setCurrentRoundId(Number(id)))
      .catch(() => {});
  }, []);

  // Computed values
  const computed = useMemo(() => {
    const startTs = datePartsToTimestamp(form.startDate, form.startHour, form.startMinute);
    const endTs = datePartsToTimestamp(form.endDate, form.endHour, form.endMinute);

    let feeWei = 0n;
    try {
      if (form.registrationFee && parseFloat(form.registrationFee) >= 0) {
        feeWei = parseEther(form.registrationFee);
      }
    } catch {
      // invalid input
    }

    let datacapBytes = 0n;
    try {
      const amount = parseFloat(form.totalDatacap);
      if (amount > 0) {
        // Support decimals: multiply by 1e9 to preserve precision, then divide back
        const scaled = BigInt(Math.round(amount * 1e9));
        datacapBytes = (scaled * DATACAP_MULTIPLIERS[form.datacapUnit]) / 1000000000n;
      }
    } catch {
      // invalid input
    }

    return { startTs, endTs, feeWei, datacapBytes };
  }, [form]);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    const nowTs = Math.floor(Date.now() / 1000);
    if (!form.startDate) errors.push("Start date is required");
    if (!form.endDate) errors.push("End date is required");
    if (computed.startTs && computed.startTs < nowTs) {
      errors.push("Start time cannot be in the past");
    }
    if (computed.endTs && computed.endTs < nowTs) {
      errors.push("End time cannot be in the past");
    }
    if (computed.startTs && computed.endTs && computed.endTs <= computed.startTs) {
      errors.push("End date must be after start date");
    }
    if (!form.registrationFee || parseFloat(form.registrationFee) < 0) {
      errors.push("Registration fee must be >= 0");
    }
    if (!form.totalDatacap || parseFloat(form.totalDatacap) <= 0) {
      errors.push("Total DataCap must be > 0");
    }
    return errors;
  }, [form, computed]);

  const isValid = validationErrors.length === 0;

  const handlePropose = useCallback(async () => {
    const calldata = encodeFunctionData({
      abi: autoCapAbi,
      functionName: "createRound",
      args: [
        BigInt(computed.startTs),
        BigInt(computed.endTs),
        computed.feeWei,
        computed.datacapBytes,
      ],
    });

    await propose({
      to: autoCapContract.address,
      data: calldata,
    });
  }, [computed, propose]);

  const isProposing = ["building", "signing", "proposing"].includes(status);

  if (status === "success" && safeTxHash) {
    return (
      <SuccessScreen
        safeTxHash={safeTxHash}
        message="The createRound transaction has been signed and proposed to the Safe."
        onReset={() => {
          reset();
          setIsReviewing(false);
          setForm({
            startDate: "",
            startHour: "0",
            startMinute: "0",
            endDate: "",
            endHour: "0",
            endMinute: "0",
            registrationFee: "0.1",
            totalDatacap: "1000",
            datacapUnit: "TiB",
          });
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Round Info */}
      {currentRoundId !== null && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Current latest round: <strong>#{currentRoundId}</strong>. The new
            round will be <strong>#{currentRoundId + 1}</strong>.
          </p>
        </div>
      )}

      {/* Form */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Round Parameters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Start Date & Time (UTC) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date & Time (UTC)
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={form.startDate}
                min={todayUTC}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startDate: e.target.value }))
                }
                disabled={isReviewing}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
              />
              <div className="flex items-center gap-1">
                <select
                  value={form.startHour}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startHour: e.target.value }))
                  }
                  disabled={isReviewing}
                  className="w-16 px-1 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50 text-center"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>{h.padStart(2, "0")}</option>
                  ))}
                </select>
                <span className="text-gray-500 dark:text-gray-400 font-bold">:</span>
                <select
                  value={form.startMinute}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startMinute: e.target.value }))
                  }
                  disabled={isReviewing}
                  className="w-16 px-1 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50 text-center"
                >
                  {MINUTES.map((m) => (
                    <option key={m} value={m}>{m.padStart(2, "0")}</option>
                  ))}
                </select>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">UTC</span>
              </div>
            </div>
            {computed.startTs > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                {formatTimestampUTC(computed.startTs)} (unix: {computed.startTs})
              </p>
            )}
          </div>

          {/* End Date & Time (UTC) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date & Time (UTC)
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={form.endDate}
                min={form.startDate || todayUTC}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endDate: e.target.value }))
                }
                disabled={isReviewing}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
              />
              <div className="flex items-center gap-1">
                <select
                  value={form.endHour}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endHour: e.target.value }))
                  }
                  disabled={isReviewing}
                  className="w-16 px-1 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50 text-center"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>{h.padStart(2, "0")}</option>
                  ))}
                </select>
                <span className="text-gray-500 dark:text-gray-400 font-bold">:</span>
                <select
                  value={form.endMinute}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endMinute: e.target.value }))
                  }
                  disabled={isReviewing}
                  className="w-16 px-1 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50 text-center"
                >
                  {MINUTES.map((m) => (
                    <option key={m} value={m}>{m.padStart(2, "0")}</option>
                  ))}
                </select>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">UTC</span>
              </div>
            </div>
            {computed.endTs > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                {formatTimestampUTC(computed.endTs)} (unix: {computed.endTs})
              </p>
            )}
          </div>

          {/* Registration Fee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Registration Fee (FIL)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.registrationFee}
              onChange={(e) =>
                setForm((f) => ({ ...f, registrationFee: e.target.value }))
              }
              disabled={isReviewing}
              placeholder="0.1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
            />
            {computed.feeWei > 0n && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                Wei: {computed.feeWei.toString()}
              </p>
            )}
          </div>

          {/* Total DataCap */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Total DataCap
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="1"
                min="1"
                value={form.totalDatacap}
                onChange={(e) =>
                  setForm((f) => ({ ...f, totalDatacap: e.target.value }))
                }
                disabled={isReviewing}
                placeholder="1000"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
              />
              <select
                value={form.datacapUnit}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    datacapUnit: e.target.value as DataCapUnit,
                  }))
                }
                disabled={isReviewing}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
              >
                <option value="GiB">GiB</option>
                <option value="TiB">TiB</option>
                <option value="PiB">PiB</option>
              </select>
            </div>
            {computed.datacapBytes > 0n && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                Bytes: {(computed.datacapBytes / DATACAP_DECIMALS).toLocaleString("en-US")}
              </p>
            )}
          </div>
        </div>

        {/* Validation Errors */}
        {!isReviewing && validationErrors.length > 0 && form.startDate && form.endDate && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            {validationErrors.map((err, i) => (
              <p key={i} className="text-sm text-red-600 dark:text-red-400">
                {err}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Preview Card */}
      {isValid && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {isReviewing ? "Review Transaction" : "Preview"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Start Time (UTC)
              </p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {formatTimestampUTC(computed.startTs)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                End Time (UTC)
              </p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {formatTimestampUTC(computed.endTs)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Duration
              </p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {durationDays(computed.startTs, computed.endTs)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Registration Fee
              </p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {form.registrationFee} FIL
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total DataCap
              </p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {form.totalDatacap} {form.datacapUnit}{" "}
                <span className="text-xs text-gray-500">
                  ({datacapToDisplay(computed.datacapBytes)})
                </span>
              </p>
            </div>
            {currentRoundId !== null && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  New Round ID
                </p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  #{currentRoundId + 1}
                </p>
              </div>
            )}
          </div>

          {/* Raw calldata (collapsible) */}
          {isReviewing && (
            <details className="mt-4">
              <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                Show raw parameters
              </summary>
              <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono break-all text-gray-600 dark:text-gray-400 space-y-1">
                <p>
                  <strong>Contract:</strong> {autoCapContract.address}
                </p>
                <p>
                  <strong>Function:</strong> createRound(uint256,uint256,uint256,uint256)
                </p>
                <p>
                  <strong>startTime:</strong> {computed.startTs}
                </p>
                <p>
                  <strong>endTime:</strong> {computed.endTs}
                </p>
                <p>
                  <strong>registrationFee:</strong>{" "}
                  {computed.feeWei.toString()} wei
                </p>
                <p>
                  <strong>totalDatacap:</strong>{" "}
                  {computed.datacapBytes.toString()} (with 18 decimals)
                </p>
              </div>
            </details>
          )}
        </div>
      )}

      {/* Error */}
      {status === "error" && error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <p className="text-red-700 dark:text-red-300 font-medium mb-2">
            Error
          </p>
          <p className="text-red-600 dark:text-red-400 text-sm">
            {error.message}
          </p>
          <button
            onClick={reset}
            className="mt-4 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        {!isReviewing ? (
          <button
            onClick={() => setIsReviewing(true)}
            disabled={!isValid}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Review Transaction
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                setIsReviewing(false);
                reset();
              }}
              disabled={isProposing}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
            <button
              onClick={handlePropose}
              disabled={isProposing}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Withdraw Fees Section
// ============================================================================

function WithdrawFeesSection() {
  const { status, error, safeTxHash, propose, reset } = useSafeAdmin();

  const [contractBalance, setContractBalance] = useState<bigint | null>(null);
  const [ownerAddress, setOwnerAddress] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Fetch contract balance and owner
  useEffect(() => {
    async function fetchData() {
      setIsLoadingData(true);
      try {
        const [balance, owner] = await Promise.all([
          publicClient.getBalance({
            address: autoCapContract.address as Address,
          }),
          publicClient.readContract({
            ...autoCapContract,
            functionName: "owner",
          }),
        ]);
        setContractBalance(balance);
        setOwnerAddress(owner as string);
      } catch (err) {
        console.error("Failed to fetch contract data:", err);
      } finally {
        setIsLoadingData(false);
      }
    }
    fetchData();
  }, [status]); // re-fetch after successful proposal

  const handlePropose = useCallback(async () => {
    const calldata = encodeFunctionData({
      abi: autoCapAbi,
      functionName: "withdrawFees",
    });

    await propose({
      to: autoCapContract.address,
      data: calldata,
    });
  }, [propose]);

  const isProposing = ["building", "signing", "proposing"].includes(status);

  if (status === "success" && safeTxHash) {
    return (
      <SuccessScreen
        safeTxHash={safeTxHash}
        message="The withdrawFees transaction has been signed and proposed to the Safe."
        onReset={reset}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Info */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Contract Balance
        </h3>

        {isLoadingData ? (
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <p className="text-gray-600 dark:text-gray-400">
              Loading balance...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Accumulated Fees
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {contractBalance !== null
                  ? `${formatEther(contractBalance)} FIL`
                  : "Error"}
              </p>
              {contractBalance !== null && contractBalance > 0n && (
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">
                  {contractBalance.toString()} wei
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Withdrawal Destination (Owner)
              </p>
              <p className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">
                {ownerAddress || "—"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>How it works:</strong> Calling <code className="font-mono text-xs bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">withdrawFees()</code> sends the{" "}
          <strong>entire</strong> contract balance to the owner address (the
          Safe multisig). There is no partial withdrawal.
        </p>
      </div>

      {/* Error */}
      {status === "error" && error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <p className="text-red-700 dark:text-red-300 font-medium mb-2">
            Error
          </p>
          <p className="text-red-600 dark:text-red-400 text-sm">
            {error.message}
          </p>
          <button
            onClick={reset}
            className="mt-4 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Action */}
      <div className="flex justify-center">
        {contractBalance === 0n ? (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
            <Wallet className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 dark:text-gray-400">
              No fees to withdraw. The contract balance is 0.
            </p>
          </div>
        ) : (
          <button
            onClick={handlePropose}
            disabled={isProposing || isLoadingData || contractBalance === null}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isProposing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {status === "building" && "Building Transaction..."}
                {status === "signing" && "Sign in Wallet..."}
                {status === "proposing" && "Proposing to Safe..."}
              </>
            ) : (
              "Sign & Propose Withdrawal"
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Close Round Section
// ============================================================================

function CloseRoundSection() {
  const { status, error, safeTxHash, propose, reset } = useSafeAdmin();

  const [totalRounds, setTotalRounds] = useState<number | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [roundStatus, setRoundStatus] = useState<string | null>(null);
  const [isLoadingRound, setIsLoadingRound] = useState(false);

  // Fetch total rounds on mount
  useEffect(() => {
    publicClient
      .readContract({
        ...autoCapContract,
        functionName: "currentRoundId",
      })
      .then((id) => {
        const total = Number(id);
        setTotalRounds(total);
        setSelectedRoundId(total);
      })
      .catch(() => {});
  }, []);

  // Fetch selected round status
  useEffect(() => {
    if (selectedRoundId === null) return;
    setIsLoadingRound(true);
    setRoundStatus(null);

    publicClient
      .readContract({
        ...autoCapContract,
        functionName: "getRound",
        args: [BigInt(selectedRoundId)],
      })
      .then((result) => {
        const [startTime, endTime] = result as [bigint, bigint, bigint, bigint];
        const now = Math.floor(Date.now() / 1000);
        const start = Number(startTime);
        const end = Number(endTime);
        if (now < start) setRoundStatus("upcoming");
        else if (now > end) setRoundStatus("closed");
        else setRoundStatus("open");
      })
      .catch(() => setRoundStatus("error"))
      .finally(() => setIsLoadingRound(false));
  }, [selectedRoundId, status]); // re-fetch after proposal

  const canClose = roundStatus === "open";

  const handlePropose = useCallback(async () => {
    if (selectedRoundId === null) return;
    const calldata = encodeFunctionData({
      abi: autoCapAbi,
      functionName: "closeRound",
      args: [BigInt(selectedRoundId)],
    });

    await propose({
      to: autoCapContract.address,
      data: calldata,
    });
  }, [selectedRoundId, propose]);

  const isProposing = ["building", "signing", "proposing"].includes(status);

  if (status === "success" && safeTxHash) {
    return (
      <SuccessScreen
        safeTxHash={safeTxHash}
        message={`The closeRound(${selectedRoundId}) transaction has been signed and proposed to the Safe.`}
        onReset={reset}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Round Selector */}
      {totalRounds !== null && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedRoundId((prev) => Math.max(1, (prev || 1) - 1))}
              disabled={selectedRoundId === null || selectedRoundId <= 1}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Round {selectedRoundId}
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                  of {totalRounds}
                </span>
              </p>
              {isLoadingRound ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 mx-auto mt-1" />
              ) : roundStatus ? (
                <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${
                  roundStatus === "open"
                    ? "text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30"
                    : roundStatus === "upcoming"
                    ? "text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30"
                    : "text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800"
                }`}>
                  {roundStatus === "open" ? "Open" : roundStatus === "upcoming" ? "Upcoming" : "Closed"}
                </span>
              ) : null}
            </div>

            <button
              onClick={() => setSelectedRoundId((prev) => Math.min(totalRounds, (prev || totalRounds) + 1))}
              disabled={selectedRoundId === null || selectedRoundId >= totalRounds}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>How it works:</strong> <code className="font-mono text-xs bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">closeRound()</code> sets
          the round&apos;s end time to now, closing it early. Only <strong>open</strong> rounds can be closed
          (not upcoming or already closed).
        </p>
      </div>

      {/* Error */}
      {status === "error" && error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <p className="text-red-700 dark:text-red-300 font-medium mb-2">Error</p>
          <p className="text-red-600 dark:text-red-400 text-sm">{error.message}</p>
          <button
            onClick={reset}
            className="mt-4 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Action */}
      <div className="flex justify-center">
        {!canClose ? (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
            <StopCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 dark:text-gray-400">
              {roundStatus === "upcoming"
                ? "This round hasn't started yet. Only open rounds can be closed."
                : roundStatus === "closed"
                ? "This round is already closed."
                : "Select a round to close."}
            </p>
          </div>
        ) : (
          <button
            onClick={handlePropose}
            disabled={isProposing}
            className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isProposing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {status === "building" && "Building Transaction..."}
                {status === "signing" && "Sign in Wallet..."}
                {status === "proposing" && "Proposing to Safe..."}
              </>
            ) : (
              <>
                <StopCircle className="w-5 h-5" />
                Close Round {selectedRoundId}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Distribute Section
// ============================================================================

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

function DistributeSection() {
  const {
    status,
    error,
    distributionData,
    safeTxHash,
    fetchDistribution,
    proposeDistribution,
    reset,
  } = useSafeDistribution();

  const [totalRounds, setTotalRounds] = useState<number | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [selectedRoundStatus, setSelectedRoundStatus] = useState<string | null>(null);
  const [previousProposal, setPreviousProposal] = useState<ProposedRound | null>(null);
  const [isWarningDismissed, setIsWarningDismissed] = useState(false);
  const [showReproposalConfirm, setShowReproposalConfirm] = useState(false);

  // Fetch total rounds on mount
  useEffect(() => {
    publicClient
      .readContract({
        ...autoCapContract,
        functionName: "currentRoundId",
      })
      .then((id) => {
        const total = Number(id);
        setTotalRounds(total);
        setSelectedRoundId(total);
      })
      .catch(() => {});
  }, []);

  // Check round status on-chain, only call distribution API for closed rounds
  useEffect(() => {
    if (selectedRoundId === null) return;
    reset();
    setSelectedRoundStatus(null);

    publicClient
      .readContract({
        ...autoCapContract,
        functionName: "getRound",
        args: [BigInt(selectedRoundId)],
      })
      .then((result) => {
        const [startTime, endTime] = result as [bigint, bigint, bigint, bigint];
        const now = BigInt(Math.floor(Date.now() / 1000));
        let roundStatus: string;
        if (now < startTime) {
          roundStatus = "upcoming";
        } else if (now >= startTime && now <= endTime) {
          roundStatus = "open";
        } else {
          roundStatus = "closed";
        }
        setSelectedRoundStatus(roundStatus);

        if (roundStatus === "closed") {
          fetchDistribution(selectedRoundId);
        }
      })
      .catch(() => {
        // If we can't read the round, try fetching distribution anyway
        fetchDistribution(selectedRoundId);
      });
  }, [selectedRoundId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if this round was already proposed
  useEffect(() => {
    if (distributionData?.roundId) {
      const prev = checkRoundProposed(distributionData.roundId);
      setPreviousProposal(prev);
    } else {
      setPreviousProposal(null);
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

  // Check proposed status for the currently selected round (even before data loads)
  const selectedProposal = selectedRoundId !== null ? checkRoundProposed(selectedRoundId) : null;

  const isLoading = status === "fetching";
  const isProposing = ["building", "signing", "proposing"].includes(status);
  const isSuccess = status === "success";
  const isError = status === "error";

  // Detect "round not closed" — either from on-chain status or API error
  const isRoundNotClosed =
    (selectedRoundStatus !== null && selectedRoundStatus !== "closed") ||
    (isError && error?.message?.includes("is not closed"));

  const handleSignAndPropose = useCallback(() => {
    if (selectedProposal) {
      setShowReproposalConfirm(true);
    } else {
      proposeDistribution();
    }
  }, [selectedProposal, proposeDistribution]);

  const handleConfirmReproposal = useCallback(() => {
    setShowReproposalConfirm(false);
    proposeDistribution();
  }, [proposeDistribution]);

  if (isSuccess && safeTxHash) {
    return (
      <SuccessScreen
        safeTxHash={safeTxHash}
        message="The distribution transaction has been signed and proposed to the Safe."
        onReset={() => {
          reset();
          if (selectedRoundId !== null) {
            fetchDistribution(selectedRoundId);
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Round Selector */}
      {totalRounds !== null && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedRoundId((prev) => Math.max(1, (prev || 1) - 1))}
              disabled={selectedRoundId === null || selectedRoundId <= 1 || isLoading}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <label htmlFor="round-select" className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Round
                </label>
                <select
                  id="round-select"
                  value={selectedRoundId ?? ""}
                  onChange={(e) => setSelectedRoundId(Number(e.target.value))}
                  disabled={isLoading}
                  className="text-lg font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: totalRounds }, (_, i) => i + 1).map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  of {totalRounds}
                </span>
              </div>
              {selectedProposal ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full mt-1">
                  <CheckCircle className="w-3 h-3" />
                  Proposed
                </span>
              ) : (
                <span className="inline-flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full mt-1">
                  Not proposed
                </span>
              )}
            </div>

            <button
              onClick={() => setSelectedRoundId((prev) => Math.min(totalRounds, (prev || totalRounds) + 1))}
              disabled={selectedRoundId === null || selectedRoundId >= totalRounds || isLoading}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">MetaAllocator</p>
          <p className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">
            {METAALLOCATOR_ADDRESS}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Min Allocation</p>
          <p className="text-sm text-gray-900 dark:text-gray-100">
            1 MiB ({MIN_DATACAP_ALLOCATION.toLocaleString("en-US")} bytes)
          </p>
        </div>
      </div>

      {/* Minimum allocation warning */}
      {!isWarningDismissed && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg relative">
          <button
            onClick={() => setIsWarningDismissed(true)}
            className="absolute top-2 right-2 p-1 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-800/50 rounded transition-colors"
            aria-label="Dismiss warning"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-3 pr-6">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Allocations below 1 MiB will be skipped as they would revert on-chain.
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading distribution data for Round {selectedRoundId}...</p>
        </div>
      )}

      {/* Round not closed - info banner */}
      {isRoundNotClosed && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Round {selectedRoundId} is {selectedRoundStatus ?? "not closed"}.
              Distribution is only available for closed rounds.
            </p>
          </div>
        </div>
      )}

      {/* Error (real errors only, not "round not closed") */}
      {isError && error && !isRoundNotClosed && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <p className="text-red-700 dark:text-red-300 font-medium mb-2">Error</p>
          <p className="text-red-600 dark:text-red-400 text-sm">{error.message}</p>
          <button
            onClick={() => { reset(); if (selectedRoundId !== null) fetchDistribution(selectedRoundId); }}
            className="mt-4 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Distribution Data */}
      {distributionData && !isSuccess && (
        <>
          {/* Test Mode Warnings */}
          {(distributionData.testMode || distributionData.testOverrideActorId || distributionData.testInjectExtraWinner) && (
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <div className="flex items-start gap-3">
                <FlaskConical className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                    Test Mode Enabled
                  </p>
                  {distributionData.testMode && (
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      <strong>Amount Override:</strong> All allocations set to 1 MiB.
                    </p>
                  )}
                  {distributionData.testOverrideActorId && (
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      <strong>Actor ID Override:</strong> All recipients use{" "}
                      <code className="font-mono text-xs bg-purple-100 dark:bg-purple-900/50 px-1 py-0.5 rounded">
                        {distributionData.testOverrideActorId}
                      </code>.
                    </p>
                  )}
                  {distributionData.testInjectExtraWinner && (
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      <strong>Extra Winner Injected</strong> for batch testing.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Round Info */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Round {distributionData.roundId} Details
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
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Transactions ({distributionData.transactions.length})
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
                          {BigInt(tx.meta.allocatedDatacap).toLocaleString("en-US")}
                        </span>
                      </div>
                      {distributionData.testOverrideActorId && tx.meta.datacapActorIdOriginal !== tx.meta.datacapActorId && (
                        <div className="flex justify-between text-purple-600 dark:text-purple-400">
                          <span>Original Actor ID:</span>
                          <span className="font-mono">{tx.meta.datacapActorIdOriginal}</span>
                        </div>
                      )}
                      {distributionData.testMode && tx.meta.allocatedDatacapOriginal !== tx.meta.allocatedDatacap && (
                        <div className="flex justify-between text-purple-600 dark:text-purple-400">
                          <span>Original Amount:</span>
                          <span className="font-mono">
                            {BigInt(tx.meta.allocatedDatacapOriginal).toLocaleString("en-US")} bytes
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
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Skipped ({distributionData.skipped.length})
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

          {/* Action */}
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
                  onClick={handleSignAndPropose}
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

      {/* Re-proposal Confirmation Modal */}
      {showReproposalConfirm && selectedProposal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 max-w-md w-full shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Already Proposed
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Round {selectedProposal.roundId} was already proposed on{" "}
                  {new Date(selectedProposal.proposedAt).toLocaleString("en-US")}.
                </p>
                <a
                  href={`https://safe.filecoin.io/transactions/queue?safe=fil:${SAFE_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-flex items-center gap-1"
                >
                  Check Safe queue first
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to propose again? This will create a duplicate transaction in the Safe queue.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowReproposalConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReproposal}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
              >
                Proceed Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Admin Page
// ============================================================================

export default function AdminPage() {
  const { isConnected, address } = useAccount();

  const [accessStatus, setAccessStatus] = useState<AccessStatus>("not_connected");
  const [hasConfirmedConnection, setHasConfirmedConnection] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("create-round");
  const [allowance, setAllowance] = useState<bigint | null>(null);

  // Check access when wallet connects and user confirms
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
    checkAdminAccess(address).then((allowed) => {
      if (allowed) {
        setAccessStatus("verified");
        setTimeout(() => setAccessStatus("allowed"), 1500);
      } else {
        setAccessStatus("denied");
      }
    });
  }, [isConnected, address, hasConfirmedConnection]);

  // Fetch MetaAllocator allowance for the Safe
  useEffect(() => {
    if (accessStatus !== "allowed") return;
    publicClient
      .readContract({
        address: METAALLOCATOR_ADDRESS as Address,
        abi: metaAllocatorAbi,
        functionName: "allowance",
        args: [SAFE_ADDRESS as Address],
      })
      .then((result) => setAllowance(result as bigint))
      .catch(() => setAllowance(null));
  }, [accessStatus]);

  const handleEnterClick = useCallback(() => {
    if (isConnected && address) {
      setHasConfirmedConnection(true);
    }
  }, [isConnected, address]);

  // Access control screens
  if (accessStatus === "denied") return <AccessDeniedScreen address={address} />;
  if (accessStatus === "not_connected")
    return <ConnectWalletScreen isConnected={isConnected} onEnter={handleEnterClick} />;
  if (accessStatus === "checking") return <CheckingScreen />;
  if (accessStatus === "verified") return <VerifiedScreen />;

  return (
    <main className="flex-grow bg-gray-50 dark:bg-gray-950 py-8 transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Admin Panel
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage rounds and fees via Safe multisig.
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Safe Address
            </p>
            <p className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">
              {SAFE_ADDRESS}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              AutoCap Contract
            </p>
            <p className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">
              {autoCapContract.address}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              DC Allowance (MetaAllocator)
            </p>
            {allowance !== null ? (
              <>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatDataCap(allowance * DATACAP_DECIMALS)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                  {allowance.toLocaleString("en-US")} bytes
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400">Loading...</p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6">
          <button
            onClick={() => setActiveTab("create-round")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "create-round"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <Plus className="w-4 h-4" />
            Create Round
          </button>
          {/* Close Round tab hidden until logic is tested
          <button
            onClick={() => setActiveTab("close-round")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "close-round"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <StopCircle className="w-4 h-4" />
            Close Round
          </button>
          */}
          <button
            onClick={() => setActiveTab("withdraw-fees")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "withdraw-fees"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <Wallet className="w-4 h-4" />
            Withdraw Fees
          </button>
          <button
            onClick={() => setActiveTab("distribute")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "distribute"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <Send className="w-4 h-4" />
            Distribute
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "create-round" && <CreateRoundSection />}
        {activeTab === "close-round" && <CloseRoundSection />}
        {activeTab === "withdraw-fees" && <WithdrawFeesSection />}
        {activeTab === "distribute" && <DistributeSection />}
      </div>
    </main>
  );
}
