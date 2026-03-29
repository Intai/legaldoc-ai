import React from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Circle, Loader2 } from 'lucide-react'
import { PHASES } from '../../constants'

const PHASE_KEYS = {
  analyzing: 'newDocument.phaseAnalyzing',
  structuring: 'newDocument.phaseStructuring',
  drafting: 'newDocument.phaseDrafting',
  finalizing: 'newDocument.phaseFinalizing',
}

// 'complete' is a sentinel value sent by the backend after the final phase,
// distinct from the phases in PHASES. Without this check, indexOf would
// return -1 and all phases would incorrectly appear as pending.
function getPhaseStatus(phase, currentPhase) {
  if (currentPhase === 'complete') {
    return 'completed'
  }

  if (!currentPhase) {
    return 'pending'
  }

  const currentIndex = PHASES.indexOf(currentPhase)
  const phaseIndex = PHASES.indexOf(phase)

  if (phaseIndex < currentIndex) {
    return 'completed'
  }

  if (phaseIndex === currentIndex) {
    return 'active'
  }

  return 'pending'
}

function PhaseIcon({ status }) {
  if (status === 'completed') {
    return (
      <div className="flex items-center justify-center size-5 shrink-0 text-success-700" data-testid="phase-icon-check">
        <Check size={20} strokeWidth={2.5} />
      </div>
    )
  }

  if (status === 'active') {
    return (
      <div className="flex items-center justify-center size-5 shrink-0" data-testid="phase-icon-spinner">
        <Loader2 size={20} className="animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center size-5 shrink-0 text-neutral-400" data-testid="phase-icon-pending">
      <Circle size={20} />
    </div>
  )
}

function PhaseProgress({ currentPhase }) {
  const { t } = useTranslation()

  return (
    <div
      className="bg-neutral-50 border border-default rounded-lg p-4 max-w-[720px] mx-auto"
      data-testid="phase-progress"
    >
      <div className="flex flex-wrap gap-6">
        {PHASES.map(phase => {
          const status = getPhaseStatus(phase, currentPhase)

          return (
            <div
              key={phase}
              className="flex items-center gap-2 text-sm text-neutral-800"
              data-testid={`phase-item-${phase}`}
            >
              <PhaseIcon status={status} />
              {t(PHASE_KEYS[phase])}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PhaseProgress
