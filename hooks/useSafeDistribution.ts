"use client";

import { useState, useCallback } from "react";
import { useAccount, useWalletClient } from "wagmi";
import Safe from "@safe-global/protocol-kit";
import { SAFE_ADDRESS, SAFE_TX_SERVICE_URL } from "@/lib/constants";

interface TransactionMeta {
  recipientAddress: string;
  datacapActorId: string;
  datacapActorIdOriginal: string;
  robustAddress: string;
  clientAddressBytes: string;
  allocatedDatacap: string;
  allocatedDatacapOriginal: string;
}

interface SafeTransaction {
  to: string;
  value: string;
  data: string;
  meta: TransactionMeta;
}

interface SkippedAllocation {
  address: string;
  datacapActorId: string;
  allocatedDatacap: string;
  reason: string;
}

interface BuildDistributionResponse {
  roundId: number;
  roundStatus: string;
  latestRoundId: number;
  latestRoundStatus: string;
  transactions: SafeTransaction[];
  skipped: SkippedAllocation[];
  totalDatacapToDistribute: string;
  testMode: boolean;
  testOverrideActorId: string | null;
  testInjectExtraWinner: boolean;
}

type DistributionStatus =
  | "idle"
  | "fetching"
  | "building"
  | "signing"
  | "proposing"
  | "success"
  | "error";

interface UseSafeDistributionReturn {
  status: DistributionStatus;
  error: Error | null;
  distributionData: BuildDistributionResponse | null;
  safeTxHash: string | null;
  fetchDistribution: () => Promise<void>;
  proposeDistribution: () => Promise<void>;
  reset: () => void;
}

export function useSafeDistribution(): UseSafeDistributionReturn {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [status, setStatus] = useState<DistributionStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [distributionData, setDistributionData] =
    useState<BuildDistributionResponse | null>(null);
  const [safeTxHash, setSafeTxHash] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setDistributionData(null);
    setSafeTxHash(null);
  }, []);

  const fetchDistribution = useCallback(async () => {
    setStatus("fetching");
    setError(null);

    try {
      const response = await fetch("/api/build-distribution");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch distribution data");
      }

      setDistributionData(data);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setStatus("error");
    }
  }, []);

  const proposeDistribution = useCallback(async () => {
    if (!isConnected || !walletClient || !address) {
      setError(new Error("Wallet not connected"));
      setStatus("error");
      return;
    }

    if (!distributionData || distributionData.transactions.length === 0) {
      setError(new Error("No transactions to propose"));
      setStatus("error");
      return;
    }

    try {
      setStatus("building");

      // Get the EIP-1193 provider from window (MetaMask, etc.)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        throw new Error("No Ethereum provider found. Please install MetaMask.");
      }

      // Initialize Safe Protocol Kit with the connected wallet
      const safeSdk = await Safe.init({
        provider: ethereum,
        signer: address,
        safeAddress: SAFE_ADDRESS,
      });

      // Verify the connected wallet is a Safe owner
      const owners = await safeSdk.getOwners();
      const isOwner = owners.some(
        (owner) => owner.toLowerCase() === address.toLowerCase()
      );

      if (!isOwner) {
        throw new Error(
          "Connected wallet is not an owner of the Safe. Only Safe owners can propose transactions."
        );
      }

      // Create Safe transaction with all the batch calls
      const safeTransaction = await safeSdk.createTransaction({
        transactions: distributionData.transactions.map((tx) => ({
          to: tx.to,
          value: tx.value,
          data: tx.data,
        })),
      });

      setStatus("signing");

      // Sign the transaction
      const signedTransaction = await safeSdk.signTransaction(safeTransaction);

      // Get the Safe transaction hash
      const txHash = await safeSdk.getTransactionHash(signedTransaction);
      setSafeTxHash(txHash);

      setStatus("proposing");

      // Get the signature
      const signature = signedTransaction.signatures.get(address.toLowerCase());
      if (!signature) {
        throw new Error("Failed to get signature from signed transaction");
      }

      // Propose the transaction to Safe Transaction Service using direct fetch
      // (Safe API Kit has issues with custom txServiceUrl)
      const txData = signedTransaction.data;
      const proposalPayload = {
        to: txData.to,
        value: txData.value,
        data: txData.data || "0x",
        operation: txData.operation,
        safeTxGas: txData.safeTxGas,
        baseGas: txData.baseGas,
        gasPrice: txData.gasPrice,
        gasToken: txData.gasToken,
        refundReceiver: txData.refundReceiver,
        nonce: txData.nonce,
        contractTransactionHash: txHash,
        sender: address,
        signature: signature.data,
      };

      console.log("Proposing to:", `${SAFE_TX_SERVICE_URL}/api/v1/safes/${SAFE_ADDRESS}/multisig-transactions/`);
      console.log("Payload:", proposalPayload);

      const response = await fetch(
        `${SAFE_TX_SERVICE_URL}/api/v1/safes/${SAFE_ADDRESS}/multisig-transactions/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(proposalPayload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Safe TX Service error:", response.status, errorText);
        throw new Error(`Failed to propose transaction: ${response.status} - ${errorText}`);
      }

      setStatus("success");
    } catch (err: unknown) {
      console.error("Distribution proposal failed:", err);

      // Extract error message from various error formats
      let errorMessage = "Unknown error";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "object" && err !== null) {
        // Handle API errors that might have different structures
        const errObj = err as Record<string, unknown>;
        if (errObj.message) {
          errorMessage = String(errObj.message);
        } else if (errObj.reason) {
          errorMessage = String(errObj.reason);
        } else if (errObj.data && typeof errObj.data === "object") {
          const data = errObj.data as Record<string, unknown>;
          errorMessage = data.message ? String(data.message) : JSON.stringify(errObj.data);
        } else {
          errorMessage = JSON.stringify(err);
        }
      } else if (typeof err === "string") {
        errorMessage = err;
      }

      setError(new Error(errorMessage));
      setStatus("error");
    }
  }, [isConnected, walletClient, address, distributionData]);

  return {
    status,
    error,
    distributionData,
    safeTxHash,
    fetchDistribution,
    proposeDistribution,
    reset,
  };
}
