import { describe, it, expect } from 'vitest';
import { computeClickSelection, computeMarqueeSelection } from './interaction';

describe('interaction selection helpers', () => {
  describe('computeClickSelection', () => {
    it('selects single id when no modifier', () => {
      expect(computeClickSelection({ current: [], clickedId: 'a', isMultiModifier: false })).toEqual(['a']);
    });
    it('replaces selection when different id clicked without modifier', () => {
      expect(computeClickSelection({ current: ['a','b'], clickedId: 'c', isMultiModifier: false })).toEqual(['c']);
    });
    it('keeps selection when clicking already sole selected id', () => {
      expect(computeClickSelection({ current: ['a'], clickedId: 'a', isMultiModifier: false })).toEqual(['a']);
    });
    it('adds id with modifier', () => {
      expect(computeClickSelection({ current: ['a'], clickedId: 'b', isMultiModifier: true })).toEqual(['a','b']);
    });
    it('removes id with modifier when already selected', () => {
      expect(computeClickSelection({ current: ['a','b'], clickedId: 'b', isMultiModifier: true })).toEqual(['a']);
    });
  });

  describe('computeMarqueeSelection', () => {
    it('returns hits when no modifier', () => {
      expect(computeMarqueeSelection({ base: ['a'], hits: ['x','y'], isToggleModifier: false })).toEqual(['x','y']);
    });
    it('toggles hits relative to base with modifier - removing existing', () => {
      expect(computeMarqueeSelection({ base: ['x','y','z'], hits: ['y'], isToggleModifier: true }).sort()).toEqual(['x','z']);
    });
    it('toggles hits relative to base with modifier - adding new', () => {
      expect(computeMarqueeSelection({ base: ['x'], hits: ['a','b'], isToggleModifier: true }).sort()).toEqual(['a','b','x']);
    });
    it('mixed add/remove in one marquee', () => {
      expect(computeMarqueeSelection({ base: ['x','y'], hits: ['y','z'], isToggleModifier: true }).sort()).toEqual(['x','z']);
    });
  });
});
