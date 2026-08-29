import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, RotateCcw, XCircle, Layers, Loader2 } from 'lucide-react';
import { adminColors } from '../adminTheme';
import { ApiError } from '../lib/api';

export type ConfirmVariant = 'default' | 'warning' | 'destructive' | 'publish' | 'unpublish' | 'archive' | 'restore' | 'bulk';

export type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  /** Runs when the administrator confirms. The dialog shows a busy state until this resolves,
   *  shows any thrown error inline (never a stack trace — ApiError.message or a safe fallback),
   *  and only closes on success — so a failed request never silently looks like it worked. */
  onConfirm: () => Promise<void> | void;
};

const VARIANT_META: Record<ConfirmVariant, { icon: typeof AlertTriangle; iconBg: string; iconColor: string; confirmBg: string; defaultLabel: string }> = {
  default: { icon: AlertTriangle, iconBg: adminColors.primarySoft, iconColor: adminColors.primary, confirmBg: adminColors.primary, defaultLabel: 'Confirm' },
  warning: { icon: AlertTriangle, iconBg: '#FDF3D8', iconColor: '#9A6700', confirmBg: adminColors.warning, defaultLabel: 'Continue' },
  destructive: { icon: AlertTriangle, iconBg: '#FBEAEA', iconColor: adminColors.danger, confirmBg: adminColors.danger, defaultLabel: 'Delete' },
  publish: { icon: CheckCircle2, iconBg: adminColors.limeSoft, iconColor: '#37A866', confirmBg: adminColors.success, defaultLabel: 'Publish' },
  unpublish: { icon: XCircle, iconBg: '#F5F6F7', iconColor: adminColors.textMuted, confirmBg: adminColors.textMuted, defaultLabel: 'Unpublish' },
  archive: { icon: AlertTriangle, iconBg: '#FDF3D8', iconColor: '#9A6700', confirmBg: adminColors.warning, defaultLabel: 'Archive' },
  restore: { icon: RotateCcw, iconBg: adminColors.primarySoft, iconColor: adminColors.primary, confirmBg: adminColors.primary, defaultLabel: 'Restore' },
  bulk: { icon: Layers, iconBg: adminColors.primarySoft, iconColor: adminColors.primary, confirmBg: adminColors.primary, defaultLabel: 'Apply' },
};

function ConfirmDialogModal({
  options, busy, error, onCancel, onConfirm,
}: {
  options: ConfirmOptions; busy: boolean; error: string | null; onCancel: () => void; onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const meta = VARIANT_META[options.variant ?? 'default'];
  const Icon = meta.icon;
  const isDestructive = options.variant === 'destructive';

  useEffect(() => {
    cancelRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key === 'Tab') {
        // Two-control focus trap: Cancel <-> Confirm only.
        e.preventDefault();
        const next = document.activeElement === cancelRef.current ? confirmRef.current : cancelRef.current;
        next?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [busy, onCancel]);

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4" style={{ background: 'rgba(18,24,22,.5)' }} onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={options.description ? 'confirm-dialog-description' : undefined}
        className="w-full max-w-[440px] rounded-[16px] p-6"
        style={{ background: adminColors.cardBg, boxShadow: '0 20px 48px rgba(18,24,22,.22)' }}
      >
        <span className="grid place-items-center rounded-full mb-4" style={{ width: 44, height: 44, background: meta.iconBg, color: meta.iconColor }} aria-hidden="true">
          <Icon size={22} />
        </span>
        <h2 id="confirm-dialog-title" className="font-heading font-bold text-[17px] m-0" style={{ color: adminColors.textPrimary }}>
          {options.title}
        </h2>
        {options.description && (
          <div id="confirm-dialog-description" className="text-[13.5px] mt-2" style={{ color: adminColors.textMuted, lineHeight: 1.55 }}>
            {options.description}
          </div>
        )}
        {error && (
          <div role="alert" className="text-[13px] mt-3 px-3 py-2 rounded-[10px]" style={{ background: '#FBEAEA', color: adminColors.danger }}>
            {error}
          </div>
        )}
        <div className="flex justify-end gap-3 mt-6">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2.5 rounded-full text-[13.5px] font-semibold disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ border: `1px solid ${adminColors.cardBorder}`, color: adminColors.textPrimary, minHeight: 44 }}
          >
            {options.cancelLabel ?? 'Cancel'}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="px-4 py-2.5 rounded-full text-[13.5px] font-bold text-white disabled:opacity-70 flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: meta.confirmBg, minHeight: 44 }}
          >
            {busy && <Loader2 size={15} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {options.confirmLabel ?? meta.defaultLabel}
          </button>
        </div>
        {isDestructive && !error && (
          <p className="text-[11.5px] mt-3 m-0" style={{ color: adminColors.textMutedLight }}>This action cannot be undone.</p>
        )}
      </div>
    </div>
  );
}

/** One reusable confirmation flow for an entire page: `confirm({...})` opens the dialog and
 *  runs `onConfirm` when the administrator approves it; render `dialog` once near the root of
 *  the page. Replaces every native `window.confirm()` call with a consistent, accessible,
 *  loading/error-aware modal — see docs for the full list of migrated call sites. */
export function useConfirmDialog() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    triggerRef.current = (document.activeElement as HTMLElement) ?? null;
    setError(null);
    setBusy(false);
    setOptions(opts);
  }, []);

  const close = useCallback(() => {
    setOptions(null);
    setBusy(false);
    setError(null);
    const el = triggerRef.current;
    requestAnimationFrame(() => el?.focus?.());
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!options || busy) return;
    setBusy(true);
    setError(null);
    try {
      await options.onConfirm();
      close();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }, [options, busy, close]);

  const dialog = options ? (
    <ConfirmDialogModal options={options} busy={busy} error={error} onCancel={() => (busy ? undefined : close())} onConfirm={handleConfirm} />
  ) : null;

  return { confirm, dialog };
}
