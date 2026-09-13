import type { ReactNode } from 'react';

/** NextAdmin card: white / gray-900, soft shadow, rounded-xl. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-5 shadow-card dark:border-gray-800 dark:bg-gray-900 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`font-semibold tracking-[-0.2px] text-gray-800 dark:text-white ${className}`}>
      {children}
    </h2>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.3px] text-gray-800 dark:text-white">
          {title}
        </h1>
        {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

type BadgeVariant = 'brand' | 'success' | 'warning' | 'error' | 'neutral';

const BADGE: Record<BadgeVariant, string> = {
  brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
  success: 'bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  error: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400',
  neutral: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

export function Badge({
  children,
  variant = 'neutral',
  className = '',
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Signature NextAdmin stat tile: value, label, colored delta, optional icon disc. */
export function StatCard({
  label,
  value,
  unit,
  delta,
  icon,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: number | null;
  icon?: ReactNode;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <Card className="!p-4">
      {icon ? (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
          {icon}
        </div>
      ) : null}
      <div className="text-xs text-gray-400">{label}</div>
      <div className="mt-0.5 flex items-baseline justify-between gap-2">
        <span className="text-xl font-bold tabular-nums text-gray-800 dark:text-white">
          {value}
          {unit ? <span className="ml-1 text-sm font-normal text-gray-400">{unit}</span> : null}
        </span>
        {delta != null ? (
          <span
            className={`text-xs font-medium tabular-nums ${
              up ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {up ? '▲' : '▼'} {Math.abs(delta * 100).toFixed(1)}%
          </span>
        ) : null}
      </div>
    </Card>
  );
}
