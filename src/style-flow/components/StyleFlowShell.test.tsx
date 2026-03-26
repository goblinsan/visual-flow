/**
 * Tests for the Style Flow frontend shell components
 * Phase 1 (#176)
 * Phase 3 (#184, #185, #186): Typography, button, and navigation panels
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { StyleFlowStateMachine } from '../journey';
import { StyleFlowShell } from './StyleFlowShell';
import { StepProgress } from './StepProgress';
import { StyleCard } from './StyleCard';
import { PreviewScaffold } from './PreviewScaffold';
import { TypographyPanel, TYPOGRAPHY_PAIRINGS } from './TypographyPanel';
import { ButtonStylePanel, BUTTON_STYLES } from './ButtonStylePanel';
import { NavigationStylePanel, NAVIGATION_STYLES } from './NavigationStylePanel';
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
    expect(screen.getByText('Typography')).toBeTruthy();
    expect(screen.getByText('Button Style')).toBeTruthy();
    expect(screen.getByText('Navigation')).toBeTruthy();
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

// ── TypographyPanel ───────────────────────────────────────────────────────────

describe('TypographyPanel', () => {
  it('renders all typography pairings', () => {
    render(<TypographyPanel selectedId={null} onSelect={vi.fn()} />);
    TYPOGRAPHY_PAIRINGS.forEach((p) => {
      expect(screen.getByText(p.name)).toBeTruthy();
    });
  });

  it('calls onSelect with the pairing ID when clicked', () => {
    const onSelect = vi.fn();
    render(<TypographyPanel selectedId={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText(TYPOGRAPHY_PAIRINGS[0].name));
    expect(onSelect).toHaveBeenCalledWith(TYPOGRAPHY_PAIRINGS[0].id);
  });

  it('marks the selected pairing with aria-pressed=true', () => {
    const pairing = TYPOGRAPHY_PAIRINGS[1];
    render(<TypographyPanel selectedId={pairing.id} onSelect={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    const selectedBtn = buttons.find((b) => b.getAttribute('aria-pressed') === 'true');
    expect(selectedBtn).toBeTruthy();
  });

  it('shows font metadata for each pairing', () => {
    const { container } = render(<TypographyPanel selectedId={null} onSelect={vi.fn()} />);
    const monoLabels = container.querySelectorAll('.font-mono');
    expect(monoLabels.length).toBeGreaterThan(0);
  });
});

// ── ButtonStylePanel ──────────────────────────────────────────────────────────

describe('ButtonStylePanel', () => {
  it('renders all button styles', () => {
    render(<ButtonStylePanel selectedId={null} onSelect={vi.fn()} />);
    BUTTON_STYLES.forEach((s) => {
      expect(screen.getByText(s.name)).toBeTruthy();
    });
  });

  it('calls onSelect with the style ID when clicked', () => {
    const onSelect = vi.fn();
    render(<ButtonStylePanel selectedId={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText(BUTTON_STYLES[0].name));
    expect(onSelect).toHaveBeenCalledWith(BUTTON_STYLES[0].id);
  });

  it('marks the selected style with aria-pressed=true', () => {
    const style = BUTTON_STYLES[2]; // 'sharp'
    render(<ButtonStylePanel selectedId={style.id} onSelect={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    const selectedBtn = buttons.find((b) => b.getAttribute('aria-pressed') === 'true');
    expect(selectedBtn).toBeTruthy();
  });

  it('renders live button previews labelled "Primary" and "Ghost"', () => {
    render(<ButtonStylePanel selectedId={null} onSelect={vi.fn()} />);
    const primaryPreviews = screen.getAllByText('Primary');
    const ghostPreviews = screen.getAllByText('Ghost');
    expect(primaryPreviews.length).toBe(BUTTON_STYLES.length);
    expect(ghostPreviews.length).toBe(BUTTON_STYLES.length);
  });
});

// ── NavigationStylePanel ──────────────────────────────────────────────────────

describe('NavigationStylePanel', () => {
  it('renders all navigation styles', () => {
    render(<NavigationStylePanel selectedId={null} onSelect={vi.fn()} />);
    NAVIGATION_STYLES.forEach((s) => {
      expect(screen.getByText(s.name)).toBeTruthy();
    });
  });

  it('calls onSelect with the style ID when clicked', () => {
    const onSelect = vi.fn();
    render(<NavigationStylePanel selectedId={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText(NAVIGATION_STYLES[0].name));
    expect(onSelect).toHaveBeenCalledWith(NAVIGATION_STYLES[0].id);
  });

  it('marks the selected style with aria-pressed=true', () => {
    const style = NAVIGATION_STYLES[1]; // 'sidebar'
    render(<NavigationStylePanel selectedId={style.id} onSelect={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    const selectedBtn = buttons.find((b) => b.getAttribute('aria-pressed') === 'true');
    expect(selectedBtn).toBeTruthy();
  });

  it('renders description text for each navigation style', () => {
    render(<NavigationStylePanel selectedId={null} onSelect={vi.fn()} />);
    NAVIGATION_STYLES.forEach((s) => {
      expect(screen.getByText(s.description)).toBeTruthy();
    });
  });
});

// ── PreviewScaffold (Phase 3 overrides) ──────────────────────────────────────

describe('PreviewScaffold (Phase 3 overrides)', () => {
  it('applies typography pairing heading font to the heading element', () => {
    const { container } = render(
      <PreviewScaffold
        recommendation={MOCK_RECOMMENDATION}
        typographyPairing={{
          id: 'serif-elegance',
          name: 'Serif Elegance',
          headingFont: 'Playfair Display',
          bodyFont: 'Lato',
          description: 'Editorial',
          tags: [],
        }}
      />,
    );
    const heading = container.querySelector('h3');
    expect(heading?.style.fontFamily).toContain('Playfair Display');
  });

  it('renders "Call to action" CTA button', () => {
    render(<PreviewScaffold recommendation={MOCK_RECOMMENDATION} />);
    expect(screen.getByText('Call to action')).toBeTruthy();
  });

  it('applies button style border-radius to the CTA button', () => {
    const { container } = render(
      <PreviewScaffold
        recommendation={MOCK_RECOMMENDATION}
        buttonStyle={{
          id: 'pill',
          name: 'Pill',
          description: 'Fully rounded',
          borderRadius: '9999px',
          fontWeight: '600',
          paddingX: '1.25rem',
          outlined: false,
        }}
      />,
    );
    const cta = container.querySelector('[style*="9999px"]');
    expect(cta).toBeTruthy();
  });
});
