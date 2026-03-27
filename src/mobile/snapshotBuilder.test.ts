/**
 * Tests for snapshotBuilder
 * Issue #221 – End-to-end test coverage for main guided journeys
 */

import { describe, it, expect } from 'vitest';
import { buildSnapshot } from './snapshotBuilder';

describe('buildSnapshot', () => {
  // ── Default (minimal mood, no overrides) ──────────────────────────────────

  it('returns a valid snapshot with defaults for the minimal mood', () => {
    const snap = buildSnapshot(['minimal'], 'technology');
    expect(snap.mood).toBe('minimal');
    expect(snap.industry).toBe('technology');
    expect(snap.primaryColor).toMatch(/^#/);
    expect(snap.accentColor).toMatch(/^#/);
    expect(snap.headingFont).toBe('Inter');
    expect(snap.bodyFont).toBe('Inter');
  });

  it('uses the first mood when multiple are provided', () => {
    const snap = buildSnapshot(['bold', 'playful'], 'fashion');
    expect(snap.mood).toBe('bold');
  });

  it('falls back to "minimal" when the moods array is empty', () => {
    const snap = buildSnapshot([] as never, 'technology');
    expect(snap.mood).toBe('minimal');
  });

  // ── Colour overrides ──────────────────────────────────────────────────────

  it('applies override primary colour when provided', () => {
    const snap = buildSnapshot(['minimal'], 'technology', ['#AABBCC', '#DDEEFF', '#112233', '#445566']);
    expect(snap.primaryColor).toBe('#AABBCC');
  });

  it('applies override accent colour (index 2) when provided', () => {
    const snap = buildSnapshot(['minimal'], 'technology', ['#111111', '#222222', '#3E9BFF', '#444444']);
    expect(snap.accentColor).toBe('#3E9BFF');
  });

  it('falls back to palette colour when override array has fewer than 3 colours', () => {
    const snap = buildSnapshot(['minimal'], 'technology', ['#AABBCC', '#DDEEFF']);
    // No index-2 colour supplied → should fall back to mood palette[2]
    expect(snap.accentColor).toMatch(/^#/);
  });

  // ── Font overrides ────────────────────────────────────────────────────────

  it('applies override heading and body fonts', () => {
    const snap = buildSnapshot(['minimal'], 'technology', undefined, {
      family: 'Poppins',
      body: 'Lato',
    });
    expect(snap.headingFont).toBe('Poppins');
    expect(snap.bodyFont).toBe('Lato');
  });

  it('uses Playfair Display as heading font for the elegant mood', () => {
    const snap = buildSnapshot(['elegant'], 'fashion');
    expect(snap.headingFont).toBe('Playfair Display');
  });

  it('uses JetBrains Mono as heading font for the technical mood', () => {
    const snap = buildSnapshot(['technical'], 'technology');
    expect(snap.headingFont).toBe('JetBrains Mono');
  });

  it('font override takes precedence over mood heading font', () => {
    const snap = buildSnapshot(['elegant'], 'fashion', undefined, {
      family: 'CustomFont',
      body: 'CustomBody',
    });
    expect(snap.headingFont).toBe('CustomFont');
  });

  // ── Component tokens ──────────────────────────────────────────────────────

  it('emits component tokens when components are provided', () => {
    const snap = buildSnapshot(['minimal'], 'technology', undefined, undefined, {
      buttonStyle: 'pill',
      cardStyle: 'gradient',
      navStyle: 'top-bar',
    });
    expect(snap.tokens['component-button-style']).toBe('pill');
    expect(snap.tokens['component-card-style']).toBe('gradient');
    expect(snap.tokens['component-nav-style']).toBe('top-bar');
    expect(snap.components).toEqual({
      buttonStyle: 'pill',
      cardStyle: 'gradient',
      navStyle: 'top-bar',
    });
  });

  it('omits component tokens when components are not provided', () => {
    const snap = buildSnapshot(['minimal'], 'technology');
    expect(snap.tokens['component-button-style']).toBeUndefined();
    expect(snap.components).toBeUndefined();
  });

  // ── Base token set ────────────────────────────────────────────────────────

  it('always emits the 6 required base tokens', () => {
    const snap = buildSnapshot(['bold'], 'education');
    expect(snap.tokens).toMatchObject({
      'color-primary':    expect.any(String),
      'color-accent':     expect.any(String),
      'font-heading':     expect.any(String),
      'font-body':        expect.any(String),
      'font-size-base':   '16px',
      'line-height-base': '1.6',
    });
  });

  // ── All mood palettes resolve without throwing ────────────────────────────

  it.each([
    ['minimal'],
    ['bold'],
    ['playful'],
    ['elegant'],
    ['technical'],
  ] as const)('resolves the %s mood palette without throwing', (mood) => {
    expect(() => buildSnapshot([mood], 'technology')).not.toThrow();
  });
});
