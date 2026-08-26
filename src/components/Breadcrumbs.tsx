import { Link } from 'react-router-dom';
import { faint } from '../styles/theme';

export default function Breadcrumbs({ trail }: { trail: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-shell px-[22px] pt-6 flex flex-wrap gap-2 text-sm" style={{ color: faint }}>
      {trail.map((t, i) => {
        const last = i === trail.length - 1;
        return (
          <span key={t.path} className="flex gap-2">
            {last ? <span aria-current="page" style={{ color: 'var(--color-heading)' }}>{t.name}</span> : <Link to={t.path} style={{ color: 'var(--color-muted)' }}>{t.name}</Link>}
            {!last && <span>/</span>}
          </span>
        );
      })}
    </nav>
  );
}
