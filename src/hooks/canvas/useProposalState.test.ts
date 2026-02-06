import { renderHook, act } from '@testing-library/react';
import { useProposalState } from './useProposalState';

describe('useProposalState', () => {
  it('initializes with no proposal selected', () => {
    const { result } = renderHook(() => useProposalState());
    expect(result.current.selectedProposalId).toBeNull();
    expect(result.current.viewingProposedSpec).toBe(false);
  });

  it('selects a proposal', () => {
    const { result } = renderHook(() => useProposalState());
    act(() => { result.current.setSelectedProposalId('proposal-123'); });
    expect(result.current.selectedProposalId).toBe('proposal-123');
  });

  it('toggles viewing proposed spec', () => {
    const { result } = renderHook(() => useProposalState());
    act(() => { result.current.setViewingProposedSpec(true); });
    expect(result.current.viewingProposedSpec).toBe(true);
    act(() => { result.current.setViewingProposedSpec(false); });
    expect(result.current.viewingProposedSpec).toBe(false);
  });

  it('clears selected proposal', () => {
    const { result } = renderHook(() => useProposalState());
    act(() => { result.current.setSelectedProposalId('proposal-456'); });
    act(() => { result.current.setSelectedProposalId(null); });
    expect(result.current.selectedProposalId).toBeNull();
  });
});
