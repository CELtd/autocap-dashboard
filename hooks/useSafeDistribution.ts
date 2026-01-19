"use client";

import { useState, useCallback } from "react";
import { useAccount, useWalletClient } from "wagmi";
import Safe from "@safe-global/protocol-kit";
import { SAFE_ADDRESS, CHAIN_ID } from "@/lib/constants";
import { config } from "@/lib/constants";

interface TransactionMeta {
  recipientAddress: string;
  datacapActorId: string;
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
  transactions: SafeTransaction[];
  skipped: SkippedAllocation[];
  totalDatacapToDistribute: string;
  testMode: boolean;
  testRecipientOverride: boolean;
  testRecipientAddress: string | null;
  testInjectExtraWinner: boolean;
}

type DistributionStatus =
  | "idle"
  | "fetching"
  | "building"
  | "signing"
  | "executing"
  | "success"
  | "error";

interface UseSafeDistributionReturn {
  status: DistributionStatus;
  error: Error | null;
  distributionData: BuildDistributionResponse | null;
  txHash: string | null;
  fetchDistribution: () => Promise<void>;
  executeDistribution: () => Promise<void>;
  reset: () => void;
}

export function useSafeDistribution(): UseSafeDistributionReturn {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [status, setStatus] = useState<DistributionStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [distributionData, setDistributionData] =
    useState<BuildDistributionResponse | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setDistributionData(null);
    setTxHash(null);
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

  const executeDistribution = useCallback(async () => {
    if (!isConnected || !walletClient || !address) {
      setError(new Error("Wallet not connected"));
      setStatus("error");
      return;
    }

    if (!distributionData || distributionData.transactions.length === 0) {
      setError(new Error("No transactions to execute"));
      setStatus("error");
      return;
    }

    try {
      setStatus("building");

      // Initialize Safe SDK with the connected wallet
      const safeSdk = await Safe.init({
        provider: walletClient.transport,
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
          "Connected wallet is not an owner of the Safe. Only Safe owners can execute transactions."
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

      setStatus("executing");

      // Execute the transaction (threshold = 1, so we can execute immediately)
      const executeTxResponse =
        await safeSdk.executeTransaction(signedTransaction);

      // Get the transaction hash from the response
      const txResponse = executeTxResponse.transactionResponse as { hash?: string; wait?: () => Promise<unknown> } | undefined;

      if (txResponse?.hash) {
        setTxHash(txResponse.hash);
      }

      // Wait for the transaction to be mined if wait is available
      if (txResponse?.wait) {
        await txResponse.wait();
      }

      setStatus("success");
    } catch (err) {
      console.error("Distribution execution failed:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setStatus("error");
    }
  }, [isConnected, walletClient, address, distributionData]);

  return {
    status,
    error,
    distributionData,
    txHash,
    fetchDistribution,
    executeDistribution,
    reset,
  };
}
