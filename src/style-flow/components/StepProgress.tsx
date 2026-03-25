/**
 * StepProgress – visual breadcrumb for the Style Flow journey.
 * Renders each step with its status (completed / current / upcoming).
 */

import type { JourneyStep, JourneyStepId } from '../types';

interface StepProgressProps {
  steps: readonly JourneyStep[];
  currentStepId: JourneyStepId;
  completedSteps: JourneyStepId[];
}

export function StepProgress({ steps, currentStepId, completedSteps }: StepProgressProps) {
  return (
    <nav aria-label="Style Flow progress" className="flex items-center gap-0">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(step.id);
        const isCurrent = step.id === currentStepId;

        return (
          <div key={step.id} className="flex items-center">
            {/* Connector line (not before the first step) */}
            {index > 0 && (
              <div
                className={`h-px w-8 transition-colors duration-300 ${
                  isCompleted ? 'bg-cyan-400' : 'bg-white/20'
                }`}
              />
            )}

            {/* Step node */}
            <div className="flex flex-col items-center gap-1">
              <div
                aria-current={isCurrent ? 'step' : undefined}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold
                  transition-all duration-300
                  ${
                    isCompleted
                      ? 'bg-cyan-400 text-slate-900'
                      : isCurrent
                        ? 'bg-white/20 text-white ring-2 ring-cyan-400'
                        : 'bg-white/[0.06] text-white/40'
                  }`}
              >
                {isCompleted ? (
                  <i className="fa-solid fa-check text-[10px]" />
                ) : (
                  step.order
                )}
              </div>
              <span
                className={`text-[10px] font-medium transition-colors duration-300 ${
                  isCurrent ? 'text-white' : isCompleted ? 'text-cyan-400' : 'text-white/30'
                }`}
              >
                {step.title}
              </span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
