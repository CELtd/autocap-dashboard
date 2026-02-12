"use client";

import { useState, useCallback } from "react";
import { useAccount, useWalletClient } from "wagmi";
import Safe from "@safe-global/protocol-kit";
import { SAFE_ADDRESS, SAFE_TX_SERVICE_URL } from "@/lib/constants";

type AdminStatus =
  | "idle"
  | "building"
  | "signing"
  | "proposing"
  | "success"
  | "error";

interface UseSafeAdminReturn {
  status: AdminStatus;
  error: Error | null;
  safeTxHash: string | null;
  propose: (params: {
    to: string;
    data: string;
    value?: string;
  }) => Promise<void>;
  reset: () => void;
}

export function useSafeAdmin(): UseSafeAdminReturn {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [status, setStatus] = useState<AdminStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [safeTxHash, setSafeTxHash] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setSafeTxHash(null);
  }, []);

  const propose = useCallback(
    async (params: { to: string; data: string; value?: string }) => {
      if (!isConnected || !walletClient || !address) {
        setError(new Error("Wallet not connected"));
        setStatus("error");
        return;
      }

      try {
        setStatus("building");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ethereum = (window as any).ethereum;
        if (!ethereum) {
          throw new Error(
            "No Ethereum provider found. Please install MetaMask."
          );
        }

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

        const safeTransaction = await safeSdk.createTransaction({
          transactions: [
            {
              to: params.to,
              value: params.value || "0",
              data: params.data,
            },
          ],
        });

        setStatus("signing");

        const signedTransaction =
          await safeSdk.signTransaction(safeTransaction);
        const txHash = await safeSdk.getTransactionHash(signedTransaction);
        setSafeTxHash(txHash);

        setStatus("proposing");

        const signature = signedTransaction.signatures.get(
          address.toLowerCase()
        );
        if (!signature) {
          throw new Error("Failed to get signature from signed transaction");
        }

        const txData = signedTransaction.data;
        const proposalPayload = {
          to: txData.to,
          value: String(txData.value),
          data: txData.data || "0x",
          operation: txData.operation,
          safeTxGas: String(txData.safeTxGas),
          baseGas: String(txData.baseGas),
          gasPrice: String(txData.gasPrice),
          gasToken: txData.gasToken,
          refundReceiver: txData.refundReceiver,
          nonce: txData.nonce,
          contractTransactionHash: txHash,
          sender: address,
          signature: signature.data,
        };

        console.log("Proposing to:", `${SAFE_TX_SERVICE_URL}/api/v1/safes/${SAFE_ADDRESS}/multisig-transactions/`);
        console.log("Payload:", JSON.stringify(proposalPayload, null, 2));

        const response = await fetch(
          `${SAFE_TX_SERVICE_URL}/api/v1/safes/${SAFE_ADDRESS}/multisig-transactions/`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(proposalPayload),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            "Safe TX Service error:",
            response.status,
            errorText
          );
          throw new Error(
            `Failed to propose transaction: ${response.status} - ${errorText}`
          );
        }

        setStatus("success");
      } catch (err: unknown) {
        console.error("Admin transaction proposal failed:", err);

        let errorMessage = "Unknown error";
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === "object" && err !== null) {
          const errObj = err as Record<string, unknown>;
          if (errObj.message) {
            errorMessage = String(errObj.message);
          } else if (errObj.reason) {
            errorMessage = String(errObj.reason);
          } else {
            errorMessage = JSON.stringify(err);
          }
        } else if (typeof err === "string") {
          errorMessage = err;
        }

        setError(new Error(errorMessage));
        setStatus("error");
      }
    },
    [isConnected, walletClient, address]
  );

  return {
    status,
    error,
    safeTxHash,
    propose,
    reset,
  };
}
