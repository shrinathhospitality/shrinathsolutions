import { useEffect, useRef, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { adminColors } from '../adminTheme';

/** Non-confirming, single-button informational modal (e.g. "Import finished: 12 succeeded, 3
 *  failed — see details below"). Distinct from ConfirmDialog, which always asks the admin to
 *  approve an action; this only ever needs an acknowledgement. */
export default function AlertDialog({ title, description, onClose }: { title: string; description?: ReactNode; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4" style={{ background: 'rgba(18,24,22,.5)' }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="alert-dialog-title" className="w-full max-w-[440px] rounded-[16px] p-6" style={{ background: adminColors.cardBg, boxShadow: '0 20px 48px rgba(18,24,22,.22)' }}>
        <span className="grid place-items-center rounded-full mb-4" style={{ width: 44, height: 44, background: adminColors.primarySoft, color: adminColors.primary }} aria-hidden="true">
          <AlertCircle size={22} />
        </span>
        <h2 id="alert-dialog-title" className="font-heading font-bold text-[17px] m-0" style={{ color: adminColors.textPrimary }}>{title}</h2>
        {description && <div className="text-[13.5px] mt-2" style={{ color: adminColors.textMuted, lineHeight: 1.55 }}>{description}</div>}
        <div className="flex justify-end mt-6">
          <button ref={closeRef} type="button" onClick={onClose} className="px-4 py-2.5 rounded-full text-[13.5px] font-bold text-white" style={{ background: adminColors.primary, minHeight: 44 }}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
