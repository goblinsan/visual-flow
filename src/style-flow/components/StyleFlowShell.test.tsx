/**
 * Tests for the Style Flow frontend shell components
 * Phase 1 (#176)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { StyleFlowStateMachine } from '../journey';
import { StyleFlowShell } from './StyleFlowShell';
import { StepProgress } from './StepProgress';
import { StyleCard } from './StyleCard';
import { PreviewScaffold } from './PreviewScaffold';
import { JOURNEY_STEPS } from '../journey';
import type { StyleRecommendation } from '../types';

const MOCK_RECOMMENDATION: StyleRecommendation = {
  id: 'rec-1',
  name: 'Ocean Breeze',
  description: 'A calm, minimal palette.',
  confidence: 0.9,
  swatches: [
    { role: 'primary', hex: '#1A73E8' },
    { role: 'secondary', hex: '#4285F4' },
    { role: 'surface', hex: '#ffffff' },
    { role: 'text', hex: '#111111' },
    { role: 'accent', hex: '#34A853' },
  ],
  typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSizePx: 16, lineHeight: 1.6 },
  tokens: [{ name: 'color-primary', value: '#1A73E8', description: 'Primary colour' }],
};

// ── StepProgress ──────────────────────────────────────────────────────────────

describe('StepProgress', () => {
  it('renders all steps', () => {
    render(
      <StepProgress
        steps={JOURNEY_STEPS}
        currentStepId="seeds"
        completedSteps={[]}
      />,
    );
    expect(screen.getByText('Your Style Seeds')).toBeTruthy();
    expect(screen.getByText('Choose a Style')).toBeTruthy();
    expect(screen.getByText('Customise')).toBeTruthy();
    expect(screen.getByText('Export')).toBeTruthy();
  });

  it('marks the current step with aria-current="step"', () => {
    render(
      <StepProgress
        steps={JOURNEY_STEPS}
        currentStepId="recommendations"
        completedSteps={['seeds']}
      />,
    );
    // Order 2 node should have aria-current="step"
    const nav = screen.getByRole('navigation');
    const currentNode = nav.querySelector('[aria-current="step"]');
    expect(currentNode).toBeTruthy();
  });

  it('renders checkmark icon for completed steps', () => {
    const { container } = render(
      <StepProgress
        steps={JOURNEY_STEPS}
        currentStepId="recommendations"
        completedSteps={['seeds']}
      />,
    );
    // FontAwesome check icon is present for completed steps
    expect(container.querySelector('.fa-check')).toBeTruthy();
  });
});

// ── StyleCard ─────────────────────────────────────────────────────────────────

describe('StyleCard', () => {
  it('renders the recommendation name', () => {
    const onSelect = vi.fn();
    render(
      <StyleCard
        recommendation={MOCK_RECOMMENDATION}
        isSelected={false}
        onSelect={onSelect}
      />,
    );
    expect(screen.getByText('Ocean Breeze')).toBeTruthy();
  });

  it('renders the description', () => {
    render(
      <StyleCard
        recommendation={MOCK_RECOMMENDATION}
        isSelected={false}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText('A calm, minimal palette.')).toBeTruthy();
  });

  it('calls onSelect with the recommendation ID when clicked', () => {
    const onSelect = vi.fn();
    render(
      <StyleCard
        recommendation={MOCK_RECOMMENDATION}
        isSelected={false}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('rec-1');
  });

  it('sets aria-pressed=true when selected', () => {
    render(
      <StyleCard
        recommendation={MOCK_RECOMMENDATION}
        isSelected={true}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');
  });

  it('sets aria-pressed=false when not selected', () => {
    render(
      <StyleCard
        recommendation={MOCK_RECOMMENDATION}
        isSelected={false}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('false');
  });

  it('renders colour swatches', () => {
    const { container } = render(
      <StyleCard
        recommendation={MOCK_RECOMMENDATION}
        isSelected={false}
        onSelect={vi.fn()}
      />,
    );
    // Should have 5 colour divs inside the swatches container
    const swatchContainer = container.querySelector('.flex.gap-1.mb-3');
    expect(swatchContainer?.children).toHaveLength(MOCK_RECOMMENDATION.swatches.length);
  });

  it('shows confidence percentage', () => {
    render(
      <StyleCard
        recommendation={MOCK_RECOMMENDATION}
        isSelected={false}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText('90% match')).toBeTruthy();
  });
});

// ── PreviewScaffold ───────────────────────────────────────────────────────────

describe('PreviewScaffold', () => {
  it('shows empty state when recommendation is null', () => {
    render(<PreviewScaffold recommendation={null} />);
    expect(screen.getByText('Select a style to see a preview')).toBeTruthy();
  });

  it('renders the recommendation name in the preview header', () => {
    render(<PreviewScaffold recommendation={MOCK_RECOMMENDATION} />);
    expect(screen.getByText('Ocean Breeze')).toBeTruthy();
  });

  it('renders a "Heading preview" text', () => {
    render(<PreviewScaffold recommendation={MOCK_RECOMMENDATION} />);
    expect(screen.getByText('Heading preview')).toBeTruthy();
  });

  it('has an aria-label with the recommendation name', () => {
    const { container } = render(<PreviewScaffold recommendation={MOCK_RECOMMENDATION} />);
    const preview = container.querySelector('[aria-label]');
    expect(preview?.getAttribute('aria-label')).toBe('Preview of Ocean Breeze');
  });
});

// ── StyleFlowShell ────────────────────────────────────────────────────────────

describe('StyleFlowShell', () => {
  function makeMachine() {
    return new StyleFlowStateMachine(`test-${Date.now()}`);
  }

  it('renders the Style Flow title', () => {
    render(<StyleFlowShell machine={makeMachine()} onClose={vi.fn()} />);
    expect(screen.getByText('Style Flow')).toBeTruthy();
  });

  it('shows the seeds step on initial render', () => {
    render(<StyleFlowShell machine={makeMachine()} onClose={vi.fn()} />);
    expect(screen.getByText('Choose your mood(s)')).toBeTruthy();
  });

  it('renders all mood options', () => {
    render(<StyleFlowShell machine={makeMachine()} onClose={vi.fn()} />);
    expect(screen.getByText('Minimal')).toBeTruthy();
    expect(screen.getByText('Bold')).toBeTruthy();
    expect(screen.getByText('Playful')).toBeTruthy();
    expect(screen.getByText('Elegant')).toBeTruthy();
    expect(screen.getByText('Technical')).toBeTruthy();
  });

  it('Continue button is disabled when no moods are selected', () => {
    render(<StyleFlowShell machine={makeMachine()} onClose={vi.fn()} />);
    const continueBtn = screen.getByRole('button', { name: /continue/i });
    expect(continueBtn).toBeDisabled();
  });

  it('Continue button enables after selecting a mood', () => {
    render(<StyleFlowShell machine={makeMachine()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Minimal'));
    const continueBtn = screen.getByRole('button', { name: /continue/i });
    expect(continueBtn).not.toBeDisabled();
  });

  it('calls onClose when the dismiss button is clicked', () => {
    const onClose = vi.fn();
    render(<StyleFlowShell machine={makeMachine()} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close Style Flow'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Back button is disabled on the first step', () => {
    render(<StyleFlowShell machine={makeMachine()} onClose={vi.fn()} />);
    const backBtn = screen.getByRole('button', { name: /back/i });
    expect(backBtn).toBeDisabled();
  });
});
