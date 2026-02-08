"use client";

import React, { useState, useEffect } from "react";
import { formatFil, truncateAddress } from "@/lib/utils/format";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { autoCapContract } from "@/lib/contracts/config";
import { Loader2, X, Wallet, ArrowRight } from "lucide-react";
import { parseContractError } from "@/lib/utils/errors";
import { actorExplorerUrl } from "@/lib/constants";

interface RegisterModalProps {
    isOpen: boolean;
    onClose: () => void;
    roundId: number;
    registrationFee: bigint;
}

export function RegisterModal({ isOpen, onClose, roundId, registrationFee }: RegisterModalProps) {
    const { address, isConnected } = useAccount();
    const [inputMode, setInputMode] = useState<"actorId" | "address">("address");
    const [actorId, setActorId] = useState("");
    const [addressInput, setAddressInput] = useState("");
    const [resolvedActorId, setResolvedActorId] = useState<string | null>(null);
    const [isResolving, setIsResolving] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulationError, setSimulationError] = useState<Error | null>(null);
    const [isCheckingReceiver, setIsCheckingReceiver] = useState(false);
    const [useWalletActorId, setUseWalletActorId] = useState(false);
    const [isLoadingActorId, setIsLoadingActorId] = useState(false);

    const publicClient = usePublicClient();

    const {
        writeContractAsync: register,
        data: hash,
        isPending: isWritePending,
        error: writeError,
        reset: resetWrite
    } = useWriteContract();

    const {
        isLoading: isConfirming,
        isSuccess,
        isError: isReceiptError,
        error: receiptError
    } = useWaitForTransactionReceipt({
        hash,
    });

    const isPending = isWritePending || isConfirming;
    const txError = writeError || receiptError;

    // Get the effective actor ID based on input mode
    const getEffectiveActorId = (): string | null => {
        if (inputMode === "actorId") return actorId || null;
        return resolvedActorId;
    };

    const handleResolveAddress = async () => {
        if (!addressInput.trim()) return;

        setIsResolving(true);
        setSimulationError(null);
        setResolvedActorId(null);
        try {
            const response = await fetch("/api/resolve-address", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address: addressInput.trim() }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to resolve address");
            }

            setResolvedActorId(result.actorId);
        } catch (err) {
            setSimulationError(new Error(err instanceof Error ? err.message : "Failed to resolve address to actor ID"));
        } finally {
            setIsResolving(false);
        }
    };

    const handleSubmit = async () => {
        const effectiveActorId = getEffectiveActorId();
        if (!effectiveActorId || !publicClient || !address) return;

        resetWrite();
        setSimulationError(null);

        // Step 1: Check if actor can receive datacap
        setIsCheckingReceiver(true);
        try {
            const response = await fetch("/api/check-datacap-receiver", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ actorId: effectiveActorId }),
            });

            const result = await response.json();
            console.log("result", result);

            if (!result.canReceive) {
                setSimulationError(new Error(result.error || "This actor cannot receive datacap"));
                setIsCheckingReceiver(false);
                return;
            }
        } catch (err) {
            setSimulationError(new Error("Failed to verify actor can receive datacap"));
            setIsCheckingReceiver(false);
            return;
        }
        setIsCheckingReceiver(false);

        // Step 2: Simulate the contract call
        setIsSimulating(true);
        try {
            const { request } = await publicClient.simulateContract({
                ...autoCapContract,
                functionName: 'register',
                args: [BigInt(roundId), BigInt(effectiveActorId)],
                value: registrationFee,
                account: address,
            });

            // If simulation succeeds, execute the transaction
            await register(request);
        } catch (err) {
            console.error("Registration failed:", err);
            const errorMessage = parseContractError(err);
            setSimulationError(new Error(errorMessage));
        } finally {
            setIsSimulating(false);
        }
    };

    useEffect(() => {
        if (txError) {
            console.log("Transaction Error:", txError);
        }
    }, [txError]);

    const handleUseWallet = async () => {
        if (!address) return;

        if (inputMode === "address") {
            // In address mode, just populate the field with the wallet address
            setAddressInput(address);
            setResolvedActorId(null);
            setSimulationError(null);
            setUseWalletActorId(true);
        } else {
            // In actor ID mode, resolve directly
            setIsLoadingActorId(true);
            setSimulationError(null);
            try {
                const response = await fetch("/api/get-actor-id", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ evmAddress: address }),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || "Failed to get actor ID");
                }

                setActorId(result.actorId);
                setUseWalletActorId(true);
            } catch (err) {
                console.error("Failed to get actor ID:", err);
                setSimulationError(new Error(err instanceof Error ? err.message : "Failed to get actor ID from wallet"));
            } finally {
                setIsLoadingActorId(false);
            }
        }
    };

    const handleClose = () => {
        resetWrite();
        setActorId("");
        setAddressInput("");
        setResolvedActorId(null);
        setInputMode("address");
        setSimulationError(null);
        setIsCheckingReceiver(false);
        setUseWalletActorId(false);
        onClose();
    };

    useEffect(() => {
        if (isOpen) {
            resetWrite();
            setActorId("");
            setAddressInput("");
            setResolvedActorId(null);
            setInputMode("address");
            setSimulationError(null);
            setIsCheckingReceiver(false);
            setUseWalletActorId(false);
        }
    }, [isOpen, resetWrite]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
        >
            <div 
                className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6 relative animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={handleClose}
                    className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    <X className="w-5 h-5" />
                </button>

                {isSuccess ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Success!</h2>
                        <p className="text-gray-600 dark:text-gray-300">
                            You have successfully registered for Round {roundId}.
                        </p>
                        <button
                            onClick={handleClose}
                            className="w-full px-4 py-2 mt-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <>
                        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                            Register for Round {roundId}
                        </h2>

                        <div className="space-y-4">
                            {isConnected && address && (
                                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Wallet className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                            <span className="text-sm text-gray-600 dark:text-gray-300">
                                                Connected: <span className="font-mono font-medium">{truncateAddress(address)}</span>
                                            </span>
                                        </div>
                                        <ConnectButton.Custom>
                                            {({ openAccountModal }) => (
                                                <button
                                                    onClick={openAccountModal}
                                                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                                                >
                                                    Change
                                                </button>
                                            )}
                                        </ConnectButton.Custom>
                                    </div>
                                </div>
                            )}

                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-800">
                                <p className="text-sm text-blue-800 dark:text-blue-300">
                                    Registration Fee: <span className="font-semibold">{formatFil(registrationFee, 2)}</span>
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Datacap Recipient
                                    </label>
                                    {isConnected && address && (
                                        <button
                                            type="button"
                                            onClick={handleUseWallet}
                                            disabled={isPending || isLoadingActorId || useWalletActorId}
                                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isLoadingActorId ? "Loading..." : useWalletActorId ? "Using connected wallet" : "Use connected wallet"}
                                        </button>
                                    )}
                                </div>

                                {/* Input mode toggle */}
                                <div className="flex rounded-md border border-gray-300 dark:border-gray-700 overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setInputMode("address");
                                            setSimulationError(null);
                                            setUseWalletActorId(false);
                                        }}
                                        className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                                            inputMode === "address"
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750"
                                        }`}
                                        disabled={isPending}
                                    >
                                        Address
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setInputMode("actorId");
                                            setSimulationError(null);
                                            setResolvedActorId(null);
                                        }}
                                        className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                                            inputMode === "actorId"
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750"
                                        }`}
                                        disabled={isPending}
                                    >
                                        Actor ID
                                    </button>
                                </div>

                                {inputMode === "address" ? (
                                    <>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={addressInput}
                                                onChange={(e) => {
                                                    setAddressInput(e.target.value);
                                                    setResolvedActorId(null);
                                                    setSimulationError(null);
                                                }}
                                                placeholder="f1..., f3..., f4..., or 0x..."
                                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                                disabled={isPending || isResolving}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleResolveAddress}
                                                disabled={!addressInput.trim() || isPending || isResolving}
                                                className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                            >
                                                {isResolving ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <ArrowRight className="w-4 h-4" />
                                                )}
                                                Resolve
                                            </button>
                                        </div>
                                        {resolvedActorId && (
                                            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
                                                <p className="text-sm text-green-700 dark:text-green-300">
                                                    Resolved Actor ID: <a href={actorExplorerUrl(resolvedActorId)} target="_blank" rel="noopener noreferrer" className="font-mono font-semibold underline hover:text-green-800 dark:hover:text-green-200">{resolvedActorId}</a>
                                                </p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <input
                                        type="number"
                                        value={actorId}
                                        onChange={(e) => {
                                            setActorId(e.target.value);
                                            setUseWalletActorId(false);
                                        }}
                                        placeholder="e.g. 1000"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={isPending || (useWalletActorId && isLoadingActorId)}
                                    />
                                )}

                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Your connected wallet will be tracked for burning FIL.
                                </p>
                                <p className="text-xs text-orange-600 dark:text-orange-400">
                                    Note: You must burn FIL through{" "}
                                    <a
                                        href="https://pay.filecoin.cloud"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-semibold underline hover:text-orange-700 dark:hover:text-orange-300"
                                    >
                                        Filecoin Pay
                                    </a>{" "}
                                    during the round to receive Datacap.
                                </p>
                            </div>

                            {/* Simulation error */}
                            {simulationError && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-md text-sm break-words">
                                    <p className="font-semibold mb-1">Transaction would fail</p>
                                    <p className="whitespace-pre-line">{simulationError.message || "Transaction simulation failed"}</p>
                                </div>
                            )}

                            {/* Transaction error */}
                            {txError && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-md text-sm break-words">
                                    <p className="font-semibold mb-1">Transaction Failed</p>
                                    <p>{txError.message?.split('.')[0] || "An unknown error occurred. Please try again."}</p>
                                </div>
                            )}

                            <div className="pt-4">
                                {!isConnected ? (
                                    <div className="flex justify-center">
                                        <ConnectButton />
                                    </div>
                                ) : (
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleClose}
                                            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                            disabled={isPending}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={!getEffectiveActorId() || isPending || isSimulating || isCheckingReceiver || isResolving}
                                            className={`flex-1 px-4 py-2 text-white rounded-lg flex items-center justify-center gap-2 ${(txError || simulationError)
                                                ? 'bg-red-600 hover:bg-red-700'
                                                : 'bg-blue-600 hover:bg-blue-700'
                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            {isPending ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    {isWritePending ? 'Check Wallet...' : 'Confirming...'}
                                                </>
                                            ) : isCheckingReceiver ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Verifying Actor...
                                                </>
                                            ) : isSimulating ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Simulating...
                                                </>
                                            ) : (
                                                (txError || simulationError) ? 'Retry' : 'Register'
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
