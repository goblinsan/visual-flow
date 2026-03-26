/**
 * ConceptComparisonPanel – Phase 4 (#189)
 *
 * Displays multiple StyleConcepts in a comparison grid. Each card surfaces
 * colour swatches, typography, and key style choices so the user can make
 * an informed comparison.
 *
 * Supports: view, favorite, shortlist, and final-choice (chooseConcept).
 * A "Regenerate" button respects locked aspects to produce new variants.
 */

import type { StyleConcept, ConceptReviewStatus, LockableAspect } from '../types';

// ── ConceptCard ───────────────────────────────────────────────────────────────

interface ConceptCardProps {
  concept: StyleConcept;
  reviewStatus: ConceptReviewStatus;
  isChosen: boolean;
  /** Resolved display names for the pre-selected styles */
  typographyName: string;
  buttonName: string;
  navigationName: string;
  onChoose: (concept: StyleConcept) => void;
  onReview: (conceptId: string, status: ConceptReviewStatus) => void;
}

function ConceptCard({
  concept,
  reviewStatus,
  isChosen,
  typographyName,
  buttonName,
  navigationName,
  onChoose,
  onReview,
}: ConceptCardProps) {
  const isFavorited = reviewStatus === 'favorited';
  const isShortlisted = reviewStatus === 'shortlisted';

  const primary = concept.recommendation.swatches.find((s) => s.role === 'primary')?.hex ?? '#888';
  const surface = concept.recommendation.swatches.find((s) => s.role === 'surface')?.hex ?? '#fff';
  const textColor = concept.recommendation.swatches.find((s) => s.role === 'text')?.hex ?? '#111';

  return (
    <article
      className={`relative rounded-2xl border transition-all duration-200 overflow-hidden
        ${isChosen
          ? 'border-cyan-400/70 ring-2 ring-cyan-400/30 bg-cyan-400/5'
          : 'border-white/10 bg-white/[0.04] hover:border-white/20'
        }`}
      aria-label={`Concept: ${concept.name}`}
    >
      {/* ── Mini preview ──────────────────────────────────────────────────── */}
      <div
        className="h-20 w-full relative overflow-hidden"
        style={{ backgroundColor: surface }}
        aria-hidden="true"
      >
        {/* Simulated nav bar */}
        <div
          className="absolute top-0 left-0 right-0 h-5 flex items-center px-2 gap-1"
          style={{ backgroundColor: primary }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
        </div>
        {/* Simulated content */}
        <div className="absolute top-7 left-2 right-2 space-y-1">
          <div
            className="h-2 rounded-sm w-2/3"
            style={{ backgroundColor: textColor, opacity: 0.9 }}
          />
          <div
            className="h-1.5 rounded-sm w-full"
            style={{ backgroundColor: textColor, opacity: 0.35 }}
          />
          <div
            className="h-1.5 rounded-sm w-4/5"
            style={{ backgroundColor: textColor, opacity: 0.25 }}
          />
        </div>
        {/* CTA button stub */}
        <div
          className="absolute bottom-2 right-2 h-4 px-2 rounded flex items-center"
          style={{ backgroundColor: primary }}
        >
          <div className="h-1 w-8 rounded-sm bg-white/70" />
        </div>
      </div>

      {/* ── Colour swatches ────────────────────────────────────────────────── */}
      <div className="flex gap-0.5 px-3 pt-2">
        {concept.recommendation.swatches.slice(0, 5).map((s) => (
          <div
            key={s.role}
            title={s.role}
            className="flex-1 h-3 rounded-sm"
            style={{ backgroundColor: s.hex }}
          />
        ))}
      </div>

      {/* ── Info ───────────────────────────────────────────────────────────── */}
      <div className="px-3 pt-2 pb-3 space-y-1.5">
        <h3 className="text-sm font-semibold text-white">{concept.name}</h3>
        <p className="text-[10px] text-white/50 leading-relaxed">{concept.tagline}</p>

        {/* Style metadata */}
        <div className="grid grid-cols-3 gap-1 pt-1">
          {[
            { label: 'Type', value: typographyName },
            { label: 'Button', value: buttonName },
            { label: 'Nav', value: navigationName },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-[9px] text-white/30 uppercase tracking-wider">{label}</p>
              <p className="text-[10px] text-white/60 truncate" title={value}>{value}</p>
            </div>
          ))}
        </div>

        {/* Confidence */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <div className="flex-1 h-0.5 rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
              style={{ width: `${Math.round(concept.recommendation.confidence * 100)}%` }}
            />
          </div>
          <span className="text-[9px] text-white/40">
            {Math.round(concept.recommendation.confidence * 100)}% match
          </span>
        </div>
      </div>

      {/* ── Actions ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-3 pb-3">
        {/* Favourite */}
        <button
          type="button"
          aria-label={isFavorited ? 'Remove from favourites' : 'Add to favourites'}
          aria-pressed={isFavorited}
          onClick={() => onReview(concept.id, isFavorited ? 'viewed' : 'favorited')}
          className={`p-1.5 rounded-lg transition-colors ${
            isFavorited
              ? 'text-yellow-400 bg-yellow-400/10'
              : 'text-white/30 hover:text-yellow-400/70 hover:bg-white/[0.06]'
          }`}
        >
          <i className={`fa-${isFavorited ? 'solid' : 'regular'} fa-star text-[11px]`} />
        </button>

        {/* Shortlist */}
        <button
          type="button"
          aria-label={isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
          aria-pressed={isShortlisted}
          onClick={() => onReview(concept.id, isShortlisted ? 'viewed' : 'shortlisted')}
          className={`p-1.5 rounded-lg transition-colors ${
            isShortlisted
              ? 'text-cyan-400 bg-cyan-400/10'
              : 'text-white/30 hover:text-cyan-400/70 hover:bg-white/[0.06]'
          }`}
        >
          <i className="fa-solid fa-bookmark text-[11px]" />
        </button>

        {/* Choose */}
        <button
          type="button"
          aria-label={isChosen ? 'Selected concept' : `Choose ${concept.name}`}
          aria-pressed={isChosen}
          onClick={() => onChoose(concept)}
          className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200
            ${isChosen
              ? 'bg-cyan-500/20 border border-cyan-400/60 text-cyan-300'
              : 'bg-white/[0.06] border border-white/10 text-white/70 hover:bg-white/[0.12] hover:border-white/25'
            }`}
        >
          {isChosen ? (
            <>
              <i className="fa-solid fa-check text-[9px]" />
              Chosen
            </>
          ) : (
            'Choose'
          )}
        </button>
      </div>
    </article>
  );
}

// ── LockToggle ────────────────────────────────────────────────────────────────

interface LockToggleProps {
  label: string;
  aspect: LockableAspect;
  locked: boolean;
  onToggle: (aspect: LockableAspect) => void;
}

function LockToggle({ label, aspect, locked, onToggle }: LockToggleProps) {
  return (
    <button
      type="button"
      aria-label={locked ? `Unlock ${label}` : `Lock ${label}`}
      aria-pressed={locked}
      onClick={() => onToggle(aspect)}
      title={locked ? `${label} is locked — regenerating will keep this` : `Lock ${label} before regenerating`}
      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-150
        ${locked
          ? 'bg-cyan-500/15 border border-cyan-400/50 text-cyan-300'
          : 'bg-white/[0.04] border border-white/10 text-white/40 hover:text-white/60 hover:border-white/20'
        }`}
    >
      <i className={`fa-solid fa-${locked ? 'lock' : 'lock-open'} text-[9px]`} />
      {label}
    </button>
  );
}

// ── ConceptComparisonPanel (exported) ─────────────────────────────────────────

/** Name lookups injected from the parent to keep this component data-free */
export interface ConceptNameResolvers {
  typographyName: (id: string) => string;
  buttonName: (id: string) => string;
  navigationName: (id: string) => string;
}

export interface ConceptComparisonPanelProps {
  concepts: StyleConcept[];
  conceptReviews: Record<string, ConceptReviewStatus>;
  chosenConceptId: string | null;
  lockedAspects: LockableAspect[];
  resolvers: ConceptNameResolvers;
  onChoose: (concept: StyleConcept) => void;
  onReview: (conceptId: string, status: ConceptReviewStatus) => void;
  onToggleLock: (aspect: LockableAspect) => void;
  onRegenerate: () => void;
}

export function ConceptComparisonPanel({
  concepts,
  conceptReviews,
  chosenConceptId,
  lockedAspects,
  resolvers,
  onChoose,
  onReview,
  onToggleLock,
  onRegenerate,
}: ConceptComparisonPanelProps) {
  const markedConcepts = concepts.filter(
    (c) => conceptReviews[c.id] === 'shortlisted' || conceptReviews[c.id] === 'favorited',
  );

  return (
    <div className="space-y-4">
      {/* ── Toolbar: lock controls + regenerate ───────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-white/35 uppercase tracking-wider">Lock</span>
        {(['recommendation', 'typography', 'buttons', 'navigation'] as LockableAspect[]).map(
          (aspect) => {
            const labels: Record<LockableAspect, string> = {
              recommendation: 'Colours',
              typography: 'Type',
              buttons: 'Buttons',
              navigation: 'Nav',
            };
            return (
              <LockToggle
                key={aspect}
                label={labels[aspect]}
                aspect={aspect}
                locked={lockedAspects.includes(aspect)}
                onToggle={onToggleLock}
              />
            );
          },
        )}

        <button
          type="button"
          onClick={onRegenerate}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-white/60 text-[11px] font-medium hover:bg-white/[0.12] hover:border-white/25 hover:text-white/80 transition-all duration-150"
          aria-label="Regenerate concepts"
        >
          <i className="fa-solid fa-arrows-rotate text-[10px]" />
          Regenerate
        </button>
      </div>

      {/* ── Shortlist summary ─────────────────────────────────────────────── */}
      {markedConcepts.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.07]">
          <i className="fa-solid fa-list-check text-[10px] text-cyan-400" />
          <span className="text-[10px] text-white/50">
            {markedConcepts.length} concept{markedConcepts.length > 1 ? 's' : ''} shortlisted
          </span>
        </div>
      )}

      {/* ── Concept cards grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {concepts.map((concept) => (
          <ConceptCard
            key={concept.id}
            concept={concept}
            reviewStatus={conceptReviews[concept.id] ?? 'unseen'}
            isChosen={chosenConceptId === concept.id}
            typographyName={resolvers.typographyName(concept.typographyPairingId)}
            buttonName={resolvers.buttonName(concept.buttonStyleId)}
            navigationName={resolvers.navigationName(concept.navigationStyleId)}
            onChoose={onChoose}
            onReview={onReview}
          />
        ))}
      </div>

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {concepts.length === 0 && (
        <div className="py-12 text-center text-white/30 text-sm">
          No concepts generated yet.
        </div>
      )}
    </div>
  );
}
