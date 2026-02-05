# Phase 4 Integration Example

This document shows how to integrate Phase 4 - Agent Branches & Proposals into your canvas application.

## Step 1: Import Phase 4 Hooks and Components

```tsx
// Import hooks
import { useBranches } from './hooks/useBranches';
import { useProposals } from './hooks/useProposals';

// Import components
import { AgentTokenDialog } from './components/AgentTokenDialog';
import { ProposalListPanel } from './components/ProposalListPanel';
import { ProposalDiffView } from './components/ProposalDiffView';
import { RationaleOverlay } from './components/RationaleTooltip';

// Import types
import type { AgentToken, AgentScope, DesignRationale } from './types/agent';

// Import API client
import { apiClient } from './api/client';
```

## Step 2: Add State Management

```tsx
function CanvasApp() {
  // Canvas state (existing)
  const [spec, setSpec] = useState<LayoutSpec>(initialSpec);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  
  // Phase 4 state (new)
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [rationales, setRationales] = useState<Map<string, DesignRationale>>(new Map());
  
  // Phase 4 hooks
  const branches = useBranches({
    canvasId: 'your-canvas-id',
    enabled: true,
    refreshInterval: 30000, // Refresh every 30 seconds
  });
  
  const proposals = useProposals({
    canvasId: 'your-canvas-id',
    enabled: true,
    refreshInterval: 30000,
  });
  
  // ... rest of component
}
```

## Step 3: Implement Event Handlers

```tsx
// Generate agent token
const handleGenerateToken = async (
  agentId: string,
  scope: AgentScope
): Promise<AgentToken | null> => {
  const result = await apiClient.generateAgentToken('your-canvas-id', agentId, scope);
  
  if (result.error) {
    console.error('Failed to generate token:', result.error);
    return null;
  }
  
  return result.data || null;
};

// Approve proposal
const handleApproveProposal = async (proposalId: string) => {
  const success = await proposals.approveProposal(proposalId);
  
  if (success) {
    // Refresh canvas to show merged changes
    await refreshCanvas();
    setSelectedProposalId(null);
  }
};

// Reject proposal
const handleRejectProposal = async (proposalId: string) => {
  const success = await proposals.rejectProposal(
    proposalId,
    'Does not meet design requirements'
  );
  
  if (success) {
    setSelectedProposalId(null);
  }
};

// Get node position for rationale tooltip
const getNodePosition = (nodeId: string): { x: number; y: number } | null => {
  // Find node in spec
  const node = findNodeById(spec, nodeId);
  if (!node || !node.position) return null;
  
  // Transform to screen coordinates
  return {
    x: node.position.x * scale + panX,
    y: node.position.y * scale + panY,
  };
};
```

## Step 4: Update Canvas Layout

```tsx
return (
  <div className="flex h-screen">
    {/* Main canvas area */}
    <div className="flex-1 flex flex-col">
      {/* Toolbar with agent token button */}
      <div className="toolbar">
        <button onClick={() => setShowTokenDialog(true)}>
          Generate Agent Token
        </button>
        
        {/* Other toolbar buttons */}
      </div>
      
      {/* Canvas with rationale overlay */}
      <div className="flex-1 relative">
        <CanvasStage
          spec={spec}
          onNodeHover={setHoveredNodeId}
          // ... other props
        />
        
        {/* Rationale overlay */}
        <RationaleOverlay
          rationales={rationales}
          hoveredNodeId={hoveredNodeId}
          getNodePosition={getNodePosition}
        />
      </div>
      
      {/* Status bar */}
      <div className="status-bar">
        <span>Branches: {branches.branches.length}</span>
        <span>
          Proposals: {proposals.proposals.length} (
          {proposals.proposals.filter(p => p.status === 'pending').length} pending)
        </span>
      </div>
    </div>
    
    {/* Proposal panel */}
    <ProposalListPanel
      proposals={proposals.proposals}
      loading={proposals.loading}
      onSelectProposal={setSelectedProposalId}
      onApprove={handleApproveProposal}
      onReject={handleRejectProposal}
    />
    
    {/* Dialogs */}
    {showTokenDialog && (
      <AgentTokenDialog
        canvasId="your-canvas-id"
        onClose={() => setShowTokenDialog(false)}
        onGenerate={handleGenerateToken}
      />
    )}
    
    {selectedProposalId && (
      <ProposalDiffView
        proposal={proposals.proposals.find(p => p.id === selectedProposalId)!}
        onClose={() => setSelectedProposalId(null)}
        onApprove={() => handleApproveProposal(selectedProposalId)}
        onReject={() => handleRejectProposal(selectedProposalId)}
      />
    )}
  </div>
);
```

## Step 5: Load Rationales from Proposals

```tsx
// Load rationales when proposals change
useEffect(() => {
  const rationaleMap = new Map<string, DesignRationale>();
  
  for (const proposal of proposals.proposals) {
    if (proposal.status === 'approved') {
      for (const op of proposal.operations) {
        if (op.rationale) {
          rationaleMap.set(op.nodeId, {
            nodeId: op.nodeId,
            text: op.rationale,
            agentId: proposal.agentId,
            timestamp: proposal.createdAt,
            proposalId: proposal.id,
          });
        }
      }
    }
  }
  
  setRationales(rationaleMap);
}, [proposals.proposals]);
```

## Step 6: Handle Agent Notifications

```tsx
// Show toast when new proposal arrives
useEffect(() => {
  const pendingCount = proposals.proposals.filter(p => p.status === 'pending').length;
  
  if (pendingCount > 0) {
    showToast({
      title: 'New Proposal',
      message: `${pendingCount} proposal${pendingCount > 1 ? 's' : ''} waiting for review`,
      type: 'info',
      action: {
        label: 'Review',
        onClick: () => {
          // Auto-scroll to proposal panel or open first proposal
          const firstPending = proposals.proposals.find(p => p.status === 'pending');
          if (firstPending) {
            setSelectedProposalId(firstPending.id);
          }
        },
      },
    });
  }
}, [proposals.proposals]);
```

## Step 7: Add Keyboard Shortcuts (Optional)

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl/Cmd + Shift + A - Generate agent token
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      setShowTokenDialog(true);
    }
    
    // Ctrl/Cmd + Shift + P - Open first pending proposal
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      const firstPending = proposals.proposals.find(p => p.status === 'pending');
      if (firstPending) {
        setSelectedProposalId(firstPending.id);
      }
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [proposals.proposals]);
```

## Step 8: Testing Integration

### Test Checklist
- [ ] Generate agent token and verify it's displayed
- [ ] Copy token to clipboard
- [ ] View proposals in list panel
- [ ] Filter proposals by status
- [ ] Open proposal diff view
- [ ] Approve a proposal
- [ ] Reject a proposal
- [ ] Hover over node to see rationale
- [ ] Test auto-refresh of proposals
- [ ] Test keyboard shortcuts
- [ ] Test error handling (network errors)

### Mock Data for Testing

```tsx
// Create mock proposals for testing
const mockProposals: AgentProposal[] = [
  {
    id: 'proposal-1',
    branchId: 'branch-1',
    canvasId: 'canvas-1',
    agentId: 'design-assistant',
    status: 'pending',
    title: 'Add Navigation Header',
    description: 'Added navigation based on wireframe',
    operations: [
      {
        type: 'create',
        nodeId: 'header-1',
        after: { type: 'rect', size: { width: 800, height: 60 } },
        rationale: 'Created header container',
      },
    ],
    rationale: 'Based on wireframe provided',
    assumptions: ['Brand color is #1e293b'],
    confidence: 0.85,
    createdAt: Date.now(),
  },
];
```

## Step 9: Backend Integration

Once frontend is working with mocks, integrate with backend:

```tsx
// Update apiClient baseUrl to point to your backend
const apiClient = new ApiClient(process.env.VITE_API_URL || '/api');

// Add error handling for backend errors
const handleApproveProposal = async (proposalId: string) => {
  try {
    const success = await proposals.approveProposal(proposalId);
    if (success) {
      showToast({
        title: 'Proposal Approved',
        message: 'Changes have been merged to canvas',
        type: 'success',
      });
    }
  } catch (error) {
    showToast({
      title: 'Error',
      message: 'Failed to approve proposal',
      type: 'error',
    });
  }
};
```

## Step 10: Production Deployment

### Environment Variables

```env
VITE_API_URL=https://api.yourapp.com
VITE_WS_URL=wss://ws.yourapp.com
```

### Security Checklist
- [ ] Agent tokens expire after 24 hours
- [ ] Token validation on backend
- [ ] Rate limiting for token generation
- [ ] HTTPS only in production
- [ ] Content Security Policy headers
- [ ] CORS configuration

## Troubleshooting

### Issue: Proposals not loading
**Solution**: Check that backend API is running and CORS is configured

### Issue: Token generation fails
**Solution**: Verify user has canvas ownership permissions

### Issue: Rationale tooltips not showing
**Solution**: Ensure `getNodePosition` returns correct screen coordinates

### Issue: Approved proposals not merging
**Solution**: Implement `applyProposalOperations` backend logic

## Performance Optimization

### Reduce Re-renders
```tsx
const memoizedProposalList = useMemo(
  () => proposals.proposals.filter(p => p.status === 'pending'),
  [proposals.proposals]
);
```

### Debounce Hover Events
```tsx
const debouncedSetHoveredNode = useMemo(
  () => debounce(setHoveredNodeId, 100),
  []
);
```

### Lazy Load Proposal Details
```tsx
const ProposalDiffView = lazy(() => import('./components/ProposalDiffView'));
```

## Next Steps

1. ✅ Integrate Phase 4 into canvas app
2. ⏳ Implement backend API endpoints
3. ⏳ Deploy to staging
4. ⏳ QA with real agents
5. ⏳ Production rollout

---

For more details, see [PHASE4_GUIDE.md](./PHASE4_GUIDE.md)
