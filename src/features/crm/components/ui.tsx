/**
 * The small UI kit, styled to match the existing dashboard. Drop-in candidates for the
 * dashboard's own components (if it uses shadcn/ui, these map one-to-one).
 */
import { X } from 'lucide-react';
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

// ---- Buttons ------------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md'; icon?: ReactNode }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-sm',
        variant === 'primary' && 'bg-crm-accent text-white hover:bg-crm-accent-strong',
        variant === 'secondary' && 'border border-crm-line-strong bg-crm-card text-crm-ink hover:bg-crm-hover',
        variant === 'ghost' && 'text-crm-ink-2 hover:bg-crm-hover hover:text-crm-ink',
        variant === 'danger' && 'border border-crm-bad/40 bg-crm-bad/10 text-crm-bad hover:bg-crm-bad/20',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

// ---- Surfaces -----------------------------------------------------------------------------

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('card', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, hint, right, icon }: { title: ReactNode; hint?: ReactNode; right?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-crm-line px-5 py-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-crm-ink">
          {icon}
          {title}
        </div>
        {hint && <div className="mt-0.5 text-[13px] text-crm-ink-3">{hint}</div>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="label-caps">{children}</h2>
      {right}
    </div>
  );
}

// ---- Pills and badges ---------------------------------------------------------------------

export type Tone = 'neutral' | 'accent' | 'good' | 'bad' | 'warn' | 'info';
const TONES: Record<Tone, string> = {
  neutral: 'border-crm-line-strong bg-crm-raised text-crm-ink-2',
  accent: 'border-crm-accent/30 bg-crm-accent/10 text-crm-accent-ink',
  good: 'border-crm-good/30 bg-crm-good/10 text-crm-good',
  bad: 'border-crm-bad/30 bg-crm-bad/10 text-crm-bad',
  warn: 'border-crm-warn/30 bg-crm-warn/10 text-crm-warn',
  info: 'border-crm-info/30 bg-crm-info/10 text-crm-info',
};

export function Pill({ tone = 'neutral', children, icon, className, title }: { tone?: Tone; children: ReactNode; icon?: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cx('inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs font-medium', TONES[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

export function Dot({ tone = 'neutral' }: { tone?: Tone }) {
  const color = { neutral: 'bg-crm-ink-3', accent: 'bg-crm-accent', good: 'bg-crm-good', bad: 'bg-crm-bad', warn: 'bg-crm-warn', info: 'bg-crm-info' }[tone];
  return <span className={cx('inline-block size-1.5 rounded-full', color)} aria-hidden />;
}

// ---- Toggle -------------------------------------------------------------------------------

export function Toggle({ checked, onChange, label, disabled, size = 'md' }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cx(
        'relative inline-flex shrink-0 items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        size === 'sm' ? 'h-5 w-9' : 'h-6 w-11',
        checked ? 'border-crm-accent bg-crm-accent' : 'border-crm-line-strong bg-crm-raised',
      )}
    >
      <span
        className={cx(
          'inline-block rounded-full bg-white shadow transition-transform',
          size === 'sm' ? 'size-3.5' : 'size-4.5',
          checked ? (size === 'sm' ? 'translate-x-[18px]' : 'translate-x-[22px]') : 'translate-x-[3px]',
        )}
      />
    </button>
  );
}

// ---- Tabs ---------------------------------------------------------------------------------

export function Tabs<T extends string>({ value, onChange, items, className }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode; count?: number }[]; className?: string }) {
  return (
    <div className={cx('scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1', className)} role="tablist">
      {items.map((item) => (
        <button
          key={item.value}
          role="tab"
          aria-selected={value === item.value}
          onClick={() => onChange(item.value)}
          className={cx(
            'inline-flex h-9 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-medium transition-colors',
            value === item.value ? 'bg-crm-accent/15 text-crm-accent-ink' : 'text-crm-ink-2 hover:bg-crm-hover hover:text-crm-ink',
          )}
        >
          {item.label}
          {item.count !== undefined && <span className={cx('rounded-full px-1.5 text-xs', value === item.value ? 'bg-crm-accent/25' : 'bg-crm-raised text-crm-ink-3')}>{item.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ---- Avatar -------------------------------------------------------------------------------

export function Avatar({ name, size = 36, tone = 'accent' }: { name: string; size?: number; tone?: 'accent' | 'neutral' }) {
  const parts = name.split(' ');
  const text = `${parts[0]?.charAt(0) ?? ''}${parts[1]?.charAt(0) ?? ''}`.toUpperCase();
  return (
    <span
      className={cx('inline-flex shrink-0 items-center justify-center rounded-full border font-semibold', tone === 'accent' ? 'border-crm-accent/40 bg-crm-accent/10 text-crm-accent-ink' : 'border-crm-line-strong bg-crm-raised text-crm-ink-2')}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
      aria-hidden
    >
      {text}
    </span>
  );
}

// ---- Overlays -----------------------------------------------------------------------------

/** A dialog on desktop, a bottom sheet on the phone. */
export function Sheet({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="crm-root fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cx('relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-crm-line-strong bg-crm-card shadow-2xl sm:rounded-3xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <div className="flex items-center justify-between gap-3 border-b border-crm-line px-5 py-4">
          <div className="text-base font-semibold">{title}</div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-crm-ink-2 hover:bg-crm-hover hover:text-crm-ink" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-crm-line px-5 py-3 pb-safe">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

// ---- Misc ---------------------------------------------------------------------------------

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      {icon && <div className="mb-3 text-crm-ink-3">{icon}</div>}
      <div className="text-sm font-medium text-crm-ink">{title}</div>
      {children && <div className="mt-1 max-w-sm text-[13px] text-crm-ink-3">{children}</div>}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-crm-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-crm-ink-3">{hint}</span>}
    </label>
  );
}

export function Select<T extends string>({ value, onChange, options, className, ariaLabel }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string; ariaLabel?: string }) {
  return (
    <select aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value as T)} className={cx('input appearance-none pr-8', className)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
      <span className="text-crm-ink-3">{label}</span>
      <span className="min-w-0 text-right text-crm-ink">{children}</span>
    </div>
  );
}

/** A small toast that confirms what just happened, in plain English. */
let toastHandler: ((msg: string, tone?: Tone) => void) | undefined;
export function toast(msg: string, tone: Tone = 'good') {
  toastHandler?.(msg, tone);
}
export function registerToast(fn: typeof toastHandler) {
  toastHandler = fn;
}
