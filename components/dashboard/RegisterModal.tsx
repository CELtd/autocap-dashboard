"use client";

import React, { useState, useEffect } from "react";
import { formatFil } from "@/lib/utils/format";
import { useConnection, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { autoCapContract } from "@/lib/contracts/config";
import { Loader2, X } from "lucide-react";

interface RegisterModalProps {
    isOpen: boolean;
    onClose: () => void;
    roundId: number;
    registrationFee: bigint;
}

export function RegisterModal({ isOpen, onClose, roundId, registrationFee }: RegisterModalProps) {
    const { address, isConnected } = useConnection();
    const [actorId, setActorId] = useState("");
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulationError, setSimulationError] = useState<Error | null>(null);

    const publicClient = usePublicClient();

    const {
        mutateAsync: register,
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

    const handleSubmit = async () => {
        if (!actorId || !publicClient || !address) return;

        resetWrite();
        setSimulationError(null);
        setIsSimulating(true);

        try {
            // Simulate the transaction first
            const { request } = await publicClient.simulateContract({
                ...autoCapContract,
                functionName: 'register',
                args: [BigInt(roundId), BigInt(actorId)],
                value: registrationFee,
                account: address,
            });

            // If simulation succeeds, execute the transaction
            await register(request);
        } catch (err) {
            console.error("Registration failed:", err);
            if (err instanceof Error) {
                setSimulationError(err);
            } else {
                setSimulationError(new Error("Transaction simulation failed"));
            }
        } finally {
            setIsSimulating(false);
        }
    };

    useEffect(() => {
        if (txError) {
            console.log("Transaction Error:", txError);
        }
    }, [txError]);

    const handleClose = () => {
        resetWrite();
        setActorId("");
        setSimulationError(null);
        onClose();
    };

    useEffect(() => {
        if (isOpen) {
            resetWrite();
            setActorId("");
            setSimulationError(null);
        }
    }, [isOpen, resetWrite]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
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
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-800">
                                <p className="text-sm text-blue-800 dark:text-blue-300">
                                    Registration Fee: <span className="font-semibold">{formatFil(registrationFee, 2)}</span>
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Datacap Actor ID
                                </label>
                                <input
                                    type="number"
                                    value={actorId}
                                    onChange={(e) => setActorId(e.target.value)}
                                    placeholder="e.g. 1000"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isPending}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Enter the numeric Actor ID you wish to receive Datacap on. Your connected wallet will be tracked for burning FIL.
                                </p>
                            </div>

                            {/* Simulation error */}
                            {simulationError && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-md text-sm break-words">
                                    <p className="font-semibold mb-1">Transaction would fail</p>
                                    <p>{simulationError.message?.split('.')[0] || "Transaction simulation failed"}</p>
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
                                            disabled={!actorId || isPending || isSimulating}
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
