import { STATUS_COLORS, type ContentStatus } from '../lib/contentTypes';

export default function StatusBadge({ status }: { status: ContentStatus }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.draft;
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold capitalize"
      style={{ background: c.bg, color: c.text }}
    >
      {status}
    </span>
  );
}
