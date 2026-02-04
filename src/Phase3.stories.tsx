/**
 * Storybook stories for Phase 3 components
 * Visual demonstration of soft locks, conflict toasts, and checkpoints
 */

import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { LockBadge, LockOverlay } from './components/LockBadge';
import { ConflictToast, ConflictToastContainer } from './components/ConflictToast';
import { CheckpointPanel } from './components/CheckpointPanel';
import type { UserAwareness } from './collaboration/types';
import type { CheckpointMetadata } from './types/checkpoint';

// Mock data
const mockUser: UserAwareness = {
  clientId: 123,
  userId: 'alice@example.com',
  displayName: 'Alice Johnson',
  color: '#3b82f6',
  selection: ['rect-1'],
  dragging: {
    nodeIds: ['rect-1'],
    ghostPosition: { x: 200, y: 150 },
  },
};

const mockCollaborators = new Map<number, UserAwareness>([
  [123, mockUser],
  [
    456,
    {
      clientId: 456,
      userId: 'bob@example.com',
      displayName: 'Bob Smith',
      color: '#10b981',
      selection: [],
    },
  ],
]);

const mockCheckpoints: CheckpointMetadata[] = [
  {
    id: 'checkpoint-1',
    canvasId: 'canvas-123',
    createdAt: Date.now() - 5 * 60 * 1000,
    label: 'Before major changes',
    isAuto: false,
    sizeBytes: 12580,
  },
  {
    id: 'checkpoint-2',
    canvasId: 'canvas-123',
    createdAt: Date.now() - 15 * 60 * 1000,
    isAuto: true,
    sizeBytes: 12450,
  },
  {
    id: 'checkpoint-3',
    canvasId: 'canvas-123',
    createdAt: Date.now() - 2 * 60 * 60 * 1000,
    label: 'Initial design',
    isAuto: false,
    sizeBytes: 10200,
  },
];

// LockBadge Stories
const lockBadgeMeta: Meta<typeof LockBadge> = {
  title: 'Phase 3/LockBadge',
  component: LockBadge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default lockBadgeMeta;

type LockBadgeStory = StoryObj<typeof LockBadge>;

export const Default: LockBadgeStory = {
  args: {
    user: mockUser,
    position: { x: 100, y: 100 },
    showGhost: false,
  },
};

export const WithGhost: LockBadgeStory = {
  args: {
    user: mockUser,
    position: { x: 100, y: 100 },
    showGhost: true,
  },
};

// LockOverlay Story
export const LockOverlayStory: Meta<typeof LockOverlay> = {
  title: 'Phase 3/LockOverlay',
  component: LockOverlay,
  parameters: {
    layout: 'fullscreen',
  },
  render: function LockOverlayComponent() {
    return (
      <div className="relative h-96 w-full bg-gray-100">
        <div className="flex h-full items-center justify-center">
          <p className="text-gray-600">Canvas area - lock badges overlay on top</p>
        </div>
        <LockOverlay
          collaborators={mockCollaborators}
          getNodePosition={(nodeId: string) => {
            if (nodeId === 'rect-1') return { x: 200, y: 150 };
            return null;
          }}
        />
      </div>
    );
  },
};

// ConflictToast Stories
const conflictToastMeta: Meta<typeof ConflictToast> = {
  title: 'Phase 3/ConflictToast',
  component: ConflictToast,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const ConflictToastStories = conflictToastMeta;

type ConflictToastStory = StoryObj<typeof ConflictToast>;

export const SingleConflict: ConflictToastStory = {
  args: {
    userName: 'Alice Johnson',
    userColor: '#3b82f6',
    affectedNodeIds: ['rect-1'],
    autoDismissMs: 0, // Don't auto-dismiss for story
  },
};

export const MultipleNodes: ConflictToastStory = {
  args: {
    userName: 'Bob Smith',
    userColor: '#10b981',
    affectedNodeIds: ['rect-1', 'rect-2', 'text-1'],
    autoDismissMs: 0,
  },
};

export const WithUndo: ConflictToastStory = {
  args: {
    userName: 'Alice Johnson',
    userColor: '#3b82f6',
    affectedNodeIds: ['rect-1'],
    autoDismissMs: 0,
    onUndo: () => alert('Undo clicked!'),
  },
};

// ConflictToastContainer Story
export const ConflictToastContainerStory: Meta<typeof ConflictToastContainer> = {
  title: 'Phase 3/ConflictToastContainer',
  component: ConflictToastContainer,
  parameters: {
    layout: 'fullscreen',
  },
  render: function ConflictToastContainerComponent() {
    const conflicts = [
      {
        id: 'conflict-1',
        userName: 'Alice Johnson',
        userColor: '#3b82f6',
        affectedNodeIds: ['rect-1'],
      },
      {
        id: 'conflict-2',
        userName: 'Bob Smith',
        userColor: '#10b981',
        affectedNodeIds: ['text-1', 'text-2'],
      },
    ];

    return (
      <div className="relative h-96 w-full bg-gray-100">
        <ConflictToastContainer
          conflicts={conflicts}
          onDismiss={(id: string) => console.log('Dismiss:', id)}
          onUndo={(id: string) => console.log('Undo:', id)}
        />
      </div>
    );
  },
};

// CheckpointPanel Stories
const checkpointPanelMeta: Meta<typeof CheckpointPanel> = {
  title: 'Phase 3/CheckpointPanel',
  component: CheckpointPanel,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export const CheckpointPanelStories = checkpointPanelMeta;

type CheckpointPanelStory = StoryObj<typeof CheckpointPanel>;

export const EmptyCheckpoints: CheckpointPanelStory = {
  render: function EmptyCheckpointsStory() {
    const [isOpen, setIsOpen] = useState(true);
    
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="m-4 rounded-lg bg-blue-600 px-4 py-2 text-white"
        >
          Open Panel
        </button>
        <CheckpointPanel
          checkpoints={[]}
          isCreating={false}
          isRestoring={false}
          onCreateCheckpoint={(label?: string) => console.log('Create:', label)}
          onRestoreCheckpoint={(id: string) => console.log('Restore:', id)}
          onDeleteCheckpoint={(id: string) => console.log('Delete:', id)}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      </>
    );
  },
};

export const WithCheckpoints: CheckpointPanelStory = {
  render: function WithCheckpointsStory() {
    const [isOpen, setIsOpen] = useState(true);
    
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="m-4 rounded-lg bg-blue-600 px-4 py-2 text-white"
        >
          Open Panel
        </button>
        <CheckpointPanel
          checkpoints={mockCheckpoints}
          isCreating={false}
          isRestoring={false}
          onCreateCheckpoint={(label?: string) => console.log('Create:', label)}
          onRestoreCheckpoint={(id: string) => console.log('Restore:', id)}
          onDeleteCheckpoint={(id: string) => console.log('Delete:', id)}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      </>
    );
  },
};

export const CreatingCheckpoint: CheckpointPanelStory = {
  render: function CreatingCheckpointStory() {
    const [isOpen, setIsOpen] = useState(true);
    
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="m-4 rounded-lg bg-blue-600 px-4 py-2 text-white"
        >
          Open Panel
        </button>
        <CheckpointPanel
          checkpoints={mockCheckpoints}
          isCreating={true}
          isRestoring={false}
          onCreateCheckpoint={(label?: string) => console.log('Create:', label)}
          onRestoreCheckpoint={(id: string) => console.log('Restore:', id)}
          onDeleteCheckpoint={(id: string) => console.log('Delete:', id)}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      </>
    );
  },
};

export const RestoringCheckpoint: CheckpointPanelStory = {
  render: function RestoringCheckpointStory() {
    const [isOpen, setIsOpen] = useState(true);
    
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="m-4 rounded-lg bg-blue-600 px-4 py-2 text-white"
        >
          Open Panel
        </button>
        <CheckpointPanel
          checkpoints={mockCheckpoints}
          isCreating={false}
          isRestoring={true}
          onCreateCheckpoint={(label?: string) => console.log('Create:', label)}
          onRestoreCheckpoint={(id: string) => console.log('Restore:', id)}
          onDeleteCheckpoint={(id: string) => console.log('Delete:', id)}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      </>
    );
  },
};
