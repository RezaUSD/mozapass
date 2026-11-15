import React from 'react';
import { Button } from '@/components/ui/Button';

export type BentoVariant =
  | 'surface'
  | 'dark'
  | 'calm'
  | 'yellow'
  | 'lavender'
  | 'sky'
  | 'mint';

export type BentoCardVariant = BentoVariant;

export type PastelTone = 'peach' | 'mint' | 'lavender' | 'rose' | 'lime' | 'sky';

export interface BentoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BentoVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const VARIANT_STYLES: Record<BentoVariant, string> = {
  surface:
    'bg-white text-[#181824] border-[1.5px] border-[#E4E4EC] shadow-bento rounded-[22px]',
  dark:
    'bg-[#232329] text-white border-[1.5px] border-[#181824] shadow-bento rounded-[22px]',
  // Khusus S-005 Checkout: permukaan putih bersih yang tenang dengan kontras teks #181824 jelas
  calm:
    'bg-white text-[#181824] border-[1.5px] border-[#181824] shadow-sm rounded-[22px]',
  // 3 Warna Kartu Pastel Learnify dengan border hitam tipis 1.5px solid #181824
  yellow:
    'bg-[#FFE37E] text-[#181824] border-[1.5px] border-[#181824] rounded-[22px]',
  lavender:
    'bg-[#DEC9FF] text-[#181824] border-[1.5px] border-[#181824] rounded-[22px]',
  sky:
    'bg-[#C6EAFF] text-[#181824] border-[1.5px] border-[#181824] rounded-[22px]',
  mint:
    'bg-[#E6F9D5] text-[#181824] border-[1.5px] border-[#181824] rounded-[22px]',
};

const PADDING_STYLES = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6 sm:p-7',
};

export const PASTEL_BOX_STYLES: Record<PastelTone, string> = {
  peach: 'bg-[#FFE37E] text-[#181824] border border-[#181824]',
  lavender: 'bg-[#DEC9FF] text-[#181824] border border-[#181824]',
  sky: 'bg-[#C6EAFF] text-[#181824] border border-[#181824]',
  mint: 'bg-[#E6F9D5] text-[#1E5E2A] border border-[#181824]',
  rose: 'bg-[#FDE2E4] text-[#8A1C24] border border-[#181824]',
  lime: 'bg-[#D2F865] text-[#181824] border border-[#181824]',
};

export function BentoCard({
  variant = 'surface',
  padding = 'md',
  className = '',
  children,
  ...rest
}: BentoCardProps) {
  return (
    <div
      className={[VARIANT_STYLES[variant], PADDING_STYLES[padding], className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * Tumpukan Avatar Bulat ("+120") persis seperti di sudut kiri bawah kartu Learnify.
 */
export function AvatarStack({
  countLabel = '+120',
  badgeBgClass,
  badgeBg,
}: {
  countLabel?: string;
  badgeBgClass?: string;
  badgeBg?: string;
}) {
  const finalBadgeClass = badgeBg ?? badgeBgClass ?? 'bg-[#181824] text-white';
  return (
    <div className="flex items-center -space-x-2">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#181824] bg-[#FFE37E] text-[11px] font-extrabold text-[#181824]">
        A
      </span>
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#181824] bg-[#FDE2E4] text-[11px] font-extrabold text-[#181824]">
        R
      </span>
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#181824] bg-[#C6EAFF] text-[11px] font-extrabold text-[#181824]">
        D
      </span>
      <span
        className={`inline-flex h-8 min-w-[34px] items-center justify-center rounded-full border-2 border-[#181824] px-1.5 text-[10px] font-extrabold tabular-nums ${finalBadgeClass}`}
      >
        {countLabel}
      </span>
    </div>
  );
}

/**
 * Progress Bar Kuota ("Progress / Terjual 85/100") persis seperti kartu Learnify.
 */
export function TactileQuotaBar({
  label = 'Progress Kuota',
  rightText,
  percentage,
  used,
  total,
  trackColorClass,
  trackClass,
}: {
  label?: string;
  rightText: string;
  percentage?: number;
  used?: number;
  total?: number;
  trackColorClass?: string;
  trackClass?: string;
}) {
  const computedPct =
    typeof percentage === 'number'
      ? percentage
      : typeof used === 'number' && typeof total === 'number' && total > 0
        ? (used / total) * 100
        : 0;
  const clamped = Math.max(6, Math.min(100, Math.round(computedPct)));
  const finalTrackClass = trackClass ?? trackColorClass ?? 'bg-black/15';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-semibold text-[#181824]">
        <span>{label}</span>
        <span className="tabular-nums font-bold">{rightText}</span>
      </div>
      <div className={`h-2 w-full overflow-hidden rounded-full ${finalTrackClass}`}>
        <div
          style={{ width: `${clamped}%` }}
          className="h-full rounded-full bg-[#181824] transition-all duration-300"
        />
      </div>
    </div>
  );
}

export interface BentoMetricCardProps {
  title: string;
  subtitle?: string;
  value: string;
  metaLeftLabel?: string;
  metaLeftValue?: string;
  metaRightLabel?: string;
  metaRightValue?: string;
  tone?: PastelTone;
  icon?: React.ReactNode;
}

export function BentoMetricCard({
  title,
  subtitle,
  value,
  metaLeftLabel,
  metaLeftValue,
  metaRightLabel,
  metaRightValue,
  tone = 'peach',
}: BentoMetricCardProps) {
  const variantMap: Record<PastelTone, BentoVariant> = {
    peach: 'yellow',
    lavender: 'lavender',
    sky: 'sky',
    mint: 'mint',
    rose: 'surface',
    lime: 'yellow',
  };

  return (
    <BentoCard
      variant={variantMap[tone]}
      padding="md"
      className="flex flex-col justify-between gap-4"
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-[#181824] px-3 py-1 text-[11px] font-bold text-white">
          {title}
        </span>
        <span className="text-sm text-[#181824]">⚑</span>
      </div>

      <div>
        <p className="text-2xl font-extrabold text-[#181824] tabular-nums">{value}</p>
        {subtitle && <p className="mt-0.5 text-xs font-medium text-[#181824]/80">{subtitle}</p>}
      </div>

      {(metaLeftLabel || metaRightLabel) && (
        <div className="grid grid-cols-2 gap-2 border-t border-[#181824]/15 pt-3 text-xs">
          <div>
            {metaLeftLabel && <p className="text-[#181824]/70">{metaLeftLabel}</p>}
            {metaLeftValue && (
              <p className="mt-0.5 font-bold text-[#181824] tabular-nums">
                {metaLeftValue}
              </p>
            )}
          </div>
          <div>
            {metaRightLabel && <p className="text-[#181824]/70">{metaRightLabel}</p>}
            {metaRightValue && (
              <p className="mt-0.5 font-bold text-[#181824] tabular-nums">
                {metaRightValue}
              </p>
            )}
          </div>
        </div>
      )}
    </BentoCard>
  );
}

/**
 * State 1 dari 4 Kondisi UI Wajib: Loading Skeleton (#ECECF2 shimmer).
 */
export function BentoSkeleton({ className = 'h-48 w-full' }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Memuat data..."
      className={`animate-pulse rounded-[22px] border-[1.5px] border-[#E4E4EC] bg-[#F7F7FA] ${className}`}
    />
  );
}

/**
 * State 2 dari 4 Kondisi UI Wajib: Empty State.
 */
export function BentoEmptyState({
  title,
  description,
  actionLabel,
  onAction,
  tone = 'lavender',
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: PastelTone;
}) {
  return (
    <BentoCard variant="surface" padding="lg" className="text-center">
      <div
        className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold ${PASTEL_BOX_STYLES[tone]}`}
      >
        ∅
      </div>
      <h3 className="text-base font-extrabold text-[#181824]">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-[#6E6E82]">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button variant="primary" size="md" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </BentoCard>
  );
}

/**
 * State 3 dari 4 Kondisi UI Wajib: Error State dengan tombol Coba Lagi.
 */
export function BentoErrorState({
  title = 'Gagal memuat data',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <BentoCard
      variant="surface"
      padding="md"
      className="border-[#8A1C24] bg-[#FDE2E4] text-center"
    >
      <h3 className="text-base font-extrabold text-[#8A1C24]">{title}</h3>
      <p className="mt-1 text-sm text-[#8A1C24]/90">{message}</p>
      {onRetry && (
        <div className="mt-3">
          <Button variant="danger" size="sm" onClick={onRetry}>
            Coba Lagi
          </Button>
        </div>
      )}
    </BentoCard>
  );
}
