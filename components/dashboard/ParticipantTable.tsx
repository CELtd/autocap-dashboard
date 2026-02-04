"use client";

import { AddressLink } from "@/components/ui/AddressLink";
import { CopyButton } from "@/components/ui/CopyButton";
import { FilDisplay } from "@/components/ui/FilDisplay";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { RoundStatus, type RoundParticipant } from "@/types";
import { formatActorId, formatDataCap } from "@/lib/utils/format";

interface ParticipantTableProps {
  participants: RoundParticipant[];
  roundStatus: RoundStatus;
  isLoading?: boolean;
  onRegister?: () => void;
}

export function ParticipantTable({ participants, roundStatus, isLoading, onRegister }: ParticipantTableProps) {
  // Dynamic header based on round status
  const allocationHeader = roundStatus === RoundStatus.Closed ? "Allocated DataCap" : "Expected DataCap";

  if (isLoading) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 p-8 text-center text-gray-500 dark:text-gray-400 transition-colors duration-200">
        Loading participants...
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 overflow-hidden transition-colors duration-200">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="font-medium text-gray-900 dark:text-gray-100">Participants</h2>
        {onRegister && roundStatus === RoundStatus.Open && (
          <button
            onClick={onRegister}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-600/30 dark:border-blue-400/30 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            Register Now
          </button>
        )}
      </div>

      {participants.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          No participants registered yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-12">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  <span className="inline-flex items-center">
                    Participant Burn Address
                    <InfoTooltip
                      title="Participant Burn Address"
                      content="The wallet address that will be checked for burned FIL through a Filecoin Pay contract denominated in FIL settled during the current round."
                    />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  <span className="inline-flex items-center">
                    Participant DataCap Address
                    <InfoTooltip
                      title="Participant DataCap Address"
                      content="The Participant DataCap address is the address of the wallet where the participant wants to receive DataCap won in this round."
                    />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  <span className="inline-flex items-center">
                    FIL Burned
                    <InfoTooltip
                      title="FIL Burned"
                      content="Real-time tracker of the amount of FIL burned by Participant Address via a Filecoin Pay contract during the current round."
                    />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  <span className="inline-flex items-center">
                    {allocationHeader}
                    <InfoTooltip
                      title={allocationHeader}
                      content="Real-time tracker of the current amount of DataCap the DataCap Actor ID will receive (if the round would complete as it is) based on the FIL burned by the Participant Address."
                    />
                  </span>
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
      )}
    </div>
  );
}
