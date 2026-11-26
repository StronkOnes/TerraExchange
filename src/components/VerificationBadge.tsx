import {ShieldCheck} from 'lucide-react';
import type {VerificationLevel} from '../types/terraexchange';

const LEVEL_LABELS: Record<VerificationLevel, string> = {
  1: 'Level 1 · Account Registered',
  2: 'Level 2 · Identity Submitted',
  3: 'Level 3 · Identity Reviewed',
  4: 'Level 4 · Operational Check',
  5: 'Level 5 · Supply Docs Reviewed',
  6: 'Level 6 · Enhanced Verification',
};

export function VerificationLabel({
  level,
  compact = false,
}: {
  level: VerificationLevel;
  compact?: boolean;
}) {
  const tone =
    level >= 5
      ? 'text-emerald-700'
      : level >= 3
      ? 'text-slate-700'
      : 'text-amber-700';

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${tone} whitespace-nowrap`}>
      <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{compact ? `Verification L${level}` : LEVEL_LABELS[level]}</span>
    </span>
  );
}
