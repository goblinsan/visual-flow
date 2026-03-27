/**
 * MobileComponentStep
 *
 * Lets the user configure three key UI component categories that will be
 * reflected in the design token output and preview:
 *
 *   1. Button style  – filled / outlined / ghost / pill
 *   2. Card style    – flat / elevated / bordered / gradient
 *   3. Navigation    – bottom-bar / top-bar / side-nav
 *
 * Issue #214 – Implement component selection and configuration steps
 */

import { useState } from 'react';
import type { MobileComponentSelections } from './types';

// ── Option definitions ────────────────────────────────────────────────────────

interface ButtonOption {
  value: MobileComponentSelections['buttonStyle'];
  label: string;
  /** Tailwind classes to render a mini live preview. */
  previewClass: string;
}

const BUTTON_OPTIONS: ButtonOption[] = [
  {
    value: 'filled',
    label: 'Filled',
    previewClass: 'bg-cyan-500 text-white rounded-md px-3 py-1 text-xs font-semibold',
  },
  {
    value: 'outlined',
    label: 'Outlined',
    previewClass: 'border-2 border-cyan-500 text-cyan-400 rounded-md px-3 py-1 text-xs font-semibold bg-transparent',
  },
  {
    value: 'ghost',
    label: 'Ghost',
    previewClass: 'text-cyan-400 px-3 py-1 text-xs font-semibold underline',
  },
  {
    value: 'pill',
    label: 'Pill',
    previewClass: 'bg-cyan-500 text-white rounded-full px-4 py-1 text-xs font-semibold',
  },
];

interface CardOption {
  value: MobileComponentSelections['cardStyle'];
  label: string;
  description: string;
  icon: string;
}

const CARD_OPTIONS: CardOption[] = [
  { value: 'flat',      label: 'Flat',      description: 'No shadow, pure colour',      icon: 'fa-solid fa-square' },
  { value: 'elevated',  label: 'Elevated',  description: 'Subtle shadow for depth',    icon: 'fa-solid fa-layer-group' },
  { value: 'bordered',  label: 'Bordered',  description: 'Defined border edge',         icon: 'fa-regular fa-square' },
  { value: 'gradient',  label: 'Gradient',  description: 'Gentle colour gradient fill', icon: 'fa-solid fa-fill-drip' },
];

interface NavOption {
  value: MobileComponentSelections['navStyle'];
  label: string;
  description: string;
  icon: string;
}

const NAV_OPTIONS: NavOption[] = [
  { value: 'bottom-bar', label: 'Bottom Bar', description: 'Icons anchored to the bottom', icon: 'fa-solid fa-grip' },
  { value: 'top-bar',    label: 'Top Bar',    description: 'Classic header navigation',    icon: 'fa-solid fa-bars' },
  { value: 'side-nav',   label: 'Side Nav',   description: 'Drawer-style sidebar',         icon: 'fa-solid fa-table-columns' },
];

// ── Props ─────────────────────────────────────────────────────────────────────

export interface MobileComponentStepProps {
  /** Pre-selected defaults (optional, e.g. inferred from a template). */
  initialSelections?: Partial<MobileComponentSelections>;
  /** Called when the user confirms all three component choices. */
  onConfirm: (selections: MobileComponentSelections) => void;
  /** Called when the user taps the back button. */
  onBack: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MobileComponentStep({
  initialSelections,
  onConfirm,
  onBack,
}: MobileComponentStepProps) {
  const [buttonStyle, setButtonStyle] = useState<MobileComponentSelections['buttonStyle']>(
    initialSelections?.buttonStyle ?? 'filled',
  );
  const [cardStyle, setCardStyle] = useState<MobileComponentSelections['cardStyle']>(
    initialSelections?.cardStyle ?? 'elevated',
  );
  const [navStyle, setNavStyle] = useState<MobileComponentSelections['navStyle']>(
    initialSelections?.navStyle ?? 'bottom-bar',
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white px-5 pt-6 pb-8">
      {/* Top nav */}
      <div className="flex items-center gap-3 mb-8">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.06] border border-white/10 text-white/60"
        >
          <i className="fa-solid fa-chevron-left text-sm" />
        </button>
        <div>
          <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
            Step 3 of 4
          </p>
          <h2 className="text-lg font-bold leading-tight">Choose components</h2>
        </div>
      </div>

      {/* ── Button style ───────────────────────────────────────────────────── */}
      <section className="mb-8">
        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">
          Button style
        </p>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Button style options">
          {BUTTON_OPTIONS.map((opt) => {
            const active = buttonStyle === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                aria-label={opt.label}
                onClick={() => setButtonStyle(opt.value)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-150
                  focus:outline-none focus:ring-2 focus:ring-cyan-400/50
                  ${active ? 'border-cyan-400/60 bg-cyan-500/10' : 'border-white/10 bg-white/[0.04]'}`}
              >
                {/* Live mini preview */}
                <span className={opt.previewClass}>Button</span>
                <span className="text-xs text-white/60">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Card style ─────────────────────────────────────────────────────── */}
      <section className="mb-8">
        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">
          Card style
        </p>
        <div className="flex flex-col gap-2" role="group" aria-label="Card style options">
          {CARD_OPTIONS.map((opt) => {
            const active = cardStyle === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                aria-label={opt.label}
                onClick={() => setCardStyle(opt.value)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150
                  focus:outline-none focus:ring-2 focus:ring-cyan-400/50
                  ${active ? 'border-cyan-400/60 bg-cyan-500/10' : 'border-white/10 bg-white/[0.04]'}`}
              >
                <i className={`${opt.icon} text-white/50 text-sm w-4`} />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white/90">{opt.label}</p>
                  <p className="text-xs text-white/40">{opt.description}</p>
                </div>
                {active && <i className="fa-solid fa-check text-cyan-400 text-sm shrink-0" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Navigation style ───────────────────────────────────────────────── */}
      <section className="mb-10">
        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">
          Navigation pattern
        </p>
        <div className="flex flex-col gap-2" role="group" aria-label="Navigation style options">
          {NAV_OPTIONS.map((opt) => {
            const active = navStyle === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                aria-label={opt.label}
                onClick={() => setNavStyle(opt.value)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150
                  focus:outline-none focus:ring-2 focus:ring-cyan-400/50
                  ${active ? 'border-cyan-400/60 bg-cyan-500/10' : 'border-white/10 bg-white/[0.04]'}`}
              >
                <i className={`${opt.icon} text-white/50 text-sm w-4`} />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white/90">{opt.label}</p>
                  <p className="text-xs text-white/40">{opt.description}</p>
                </div>
                {active && <i className="fa-solid fa-check text-cyan-400 text-sm shrink-0" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <button
        type="button"
        onClick={() => onConfirm({ buttonStyle, cardStyle, navStyle })}
        className="mt-auto w-full py-4 rounded-2xl font-semibold text-base transition-all duration-200
                   bg-gradient-to-r from-cyan-500 to-blue-500 text-white
                   active:scale-[0.98]"
      >
        Preview my design
      </button>
    </div>
  );
}
