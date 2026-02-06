import { useState } from 'react';

export interface ProposalState {
  selectedProposalId: string | null;
  viewingProposedSpec: boolean;
}

export interface UseProposalStateReturn extends ProposalState {
  setSelectedProposalId: React.Dispatch<React.SetStateAction<string | null>>;
  setViewingProposedSpec: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Manages agent proposal viewing state
 */
export function useProposalState(): UseProposalStateReturn {
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [viewingProposedSpec, setViewingProposedSpec] = useState(false);

  return {
    selectedProposalId,
    setSelectedProposalId,
    viewingProposedSpec,
    setViewingProposedSpec,
  };
}
