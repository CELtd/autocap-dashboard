"use client";

import { ExternalLink } from "lucide-react";
import { truncateAddress } from "@/lib/utils/format";
import { CopyButton } from "./CopyButton";
import { config } from "@/lib/constants";

interface AddressLinkProps {
  address: string;
}

export function AddressLink({ address }: AddressLinkProps) {
  const explorerUrl = `${config.payExplorerUrl}/${address}`;

  return (
    <div className="flex items-center gap-1.5">
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-sm text-primary dark:text-blue-400 hover:underline flex items-center gap-1"
        title={address}
      >
        {truncateAddress(address)}
        <ExternalLink size={12} />
      </a>
      <CopyButton value={address} />
    </div>
  );
}
