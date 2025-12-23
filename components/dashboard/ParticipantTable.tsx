"use client";

import { AddressLink } from "@/components/ui/AddressLink";
import { CopyButton } from "@/components/ui/CopyButton";
import { FilDisplay } from "@/components/ui/FilDisplay";
import { RoundStatus, type RoundParticipant } from "@/types";
import { formatActorId, formatDataCap } from "@/lib/utils/format";

interface ParticipantTableProps {
  participants: RoundParticipant[];
  roundStatus: RoundStatus;
  isLoading?: boolean;
}

export function ParticipantTable({ participants, roundStatus, isLoading }: ParticipantTableProps) {
  // Dynamic header based on round status
  const allocationHeader = roundStatus === RoundStatus.Closed ? "Allocated DataCap" : "Expected DataCap";

  if (isLoading) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 p-8 text-center text-gray-500 dark:text-gray-400 transition-colors duration-200">
        Loading participants...
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 p-8 text-center text-gray-500 dark:text-gray-400 transition-colors duration-200">
        No participants registered yet.
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 overflow-hidden transition-colors duration-200">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-medium text-gray-900 dark:text-gray-100">Participants</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-12">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Participant Address</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">DataCap Actor ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">FIL Burned</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                {allocationHeader}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {participants.map((p, index) => (
              <tr key={p.address} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150">
                <td className="px-4 py-3 text-gray-400 dark:text-gray-500">{index + 1}</td>
                <td className="px-4 py-3">
                  <AddressLink address={p.address} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-gray-900 dark:text-gray-100">{formatActorId(p.datacapActorId)}</span>
                    <CopyButton value={p.datacapActorId.toString()} />
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-gray-900 dark:text-gray-100">
                  <FilDisplay attoFil={p.subgraphBurn} />
                </td>
                <td className="px-4 py-3 font-mono text-gray-900 dark:text-gray-100">
                  {formatDataCap(p.expectedAllocation)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
