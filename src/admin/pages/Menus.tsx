import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowUp, ArrowDown, Trash2, Plus, Save } from 'lucide-react';
import { adminFetch, ApiError } from '../lib/api';
import { adminCard, adminColors, adminPrimaryBtn } from '../adminTheme';

type MenuItem = {
  id: number;
  parent_id: number | null;
  label: string;
  url_type: 'internal' | 'external';
  internal_path: string | null;
  external_url: string | null;
  icon: string | null;
  mega_menu_slug: string | null;
  mega_column: string | null;
  display_order: number;
  children: MenuItem[];
};

const inputStyle: React.CSSProperties = {
  padding: '8px 11px',
  borderRadius: 8,
  border: `1px solid ${adminColors.cardBorder}`,
  fontSize: 13.5,
};

function useMenu(slug: string) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    return adminFetch<{ items: MenuItem[] }>(`/api/admin/menus/${slug}`)
      .then((d) => setItems(d.items))
      .catch(() => toast.error(`Failed to load ${slug} menu`))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, reload: load };
}

async function saveItem(id: number, patch: Partial<MenuItem>) {
  try {
    await adminFetch(`/api/admin/menu-items/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
    toast.success('Saved');
  } catch (err) {
    toast.error(err instanceof ApiError ? err.message : 'Failed to save');
  }
}

async function deleteItem(id: number, onDone: () => void) {
  if (!confirm('Delete this menu item? This cannot be undone.')) return;
  try {
    await adminFetch(`/api/admin/menu-items/${id}`, { method: 'DELETE' });
    toast.success('Deleted');
    onDone();
  } catch (err) {
    toast.error(err instanceof ApiError ? err.message : 'Failed to delete');
  }
}

async function reorder(slug: string, order: { id: number; display_order: number }[], onDone: () => void) {
  try {
    await adminFetch(`/api/admin/menus/${slug}/reorder`, { method: 'PUT', body: JSON.stringify({ order }) });
    onDone();
  } catch (err) {
    toast.error(err instanceof ApiError ? err.message : 'Failed to reorder');
  }
}

function move<T extends { id: number; display_order: number }>(list: T[], index: number, dir: -1 | 1): { id: number; display_order: number }[] {
  const target = index + dir;
  if (target < 0 || target >= list.length) return list.map((i) => ({ id: i.id, display_order: i.display_order }));
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy.map((item, i) => ({ id: item.id, display_order: i }));
}

function PrimaryRow({ item, index, total, slug, onReload }: { item: MenuItem; index: number; total: number; slug: string; onReload: () => void }) {
  const [label, setLabel] = useState(item.label);
  const [path, setPath] = useState(item.internal_path ?? '');

  return (
    <div style={adminCard} className="p-3.5 flex flex-wrap items-center gap-2.5">
      <input style={{ ...inputStyle, width: 180 }} value={label} onChange={(e) => setLabel(e.target.value)} />
      <input style={{ ...inputStyle, width: 200 }} value={path} onChange={(e) => setPath(e.target.value)} placeholder="/path" />
      <div className="flex items-center gap-1 ml-auto">
        <button type="button" disabled={index === 0} onClick={() => reorder(slug, move([item], 0, -1), onReload)} style={{ color: adminColors.textMuted }}>
          <ArrowUp size={16} />
        </button>
        <button type="button" disabled={index === total - 1} onClick={() => reorder(slug, move([item], 0, 1), onReload)} style={{ color: adminColors.textMuted }}>
          <ArrowDown size={16} />
        </button>
        <button type="button" onClick={() => saveItem(item.id, { label, internal_path: path, url_type: 'internal' })} style={{ color: adminColors.accentBlue }}>
          <Save size={16} />
        </button>
        <button type="button" onClick={() => deleteItem(item.id, onReload)} style={{ color: adminColors.danger }}>
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function PrimaryMenuEditor() {
  const { items, loading, reload } = useMenu('primary');
  const [newLabel, setNewLabel] = useState('');
  const [newPath, setNewPath] = useState('');

  async function addItem() {
    if (!newLabel.trim()) return;
    try {
      await adminFetch('/api/admin/menus/primary/items', {
        method: 'POST',
        body: JSON.stringify({ label: newLabel, internal_path: newPath || '/', display_order: items.length }),
      });
      setNewLabel('');
      setNewPath('');
      toast.success('Added');
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to add item');
    }
  }

  if (loading) return <div style={{ color: adminColors.textMuted }}>Loading…</div>;

  return (
    <div className="grid gap-2.5">
      {items.map((item, i) => (
        <PrimaryRow key={item.id} item={item} index={i} total={items.length} slug="primary" onReload={reload} />
      ))}
      <div style={{ ...adminCard, borderStyle: 'dashed' }} className="p-3.5 flex flex-wrap items-center gap-2.5">
        <input style={{ ...inputStyle, width: 180 }} placeholder="Label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
        <input style={{ ...inputStyle, width: 200 }} placeholder="/path" value={newPath} onChange={(e) => setNewPath(e.target.value)} />
        <button type="button" onClick={addItem} className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[13.5px]" style={adminPrimaryBtn}>
          <Plus size={14} /> Add nav item
        </button>
      </div>
    </div>
  );
}

function MegaColumnEditor({ column, index, total, onReload }: { column: MenuItem; index: number; total: number; onReload: () => void }) {
  const [title, setTitle] = useState(column.label);
  const [icon, setIcon] = useState(column.icon ?? '');
  const [newChildLabel, setNewChildLabel] = useState('');
  const [newChildPath, setNewChildPath] = useState('');

  async function addChild() {
    if (!newChildLabel.trim()) return;
    try {
      await adminFetch('/api/admin/menus/services_mega/items', {
        method: 'POST',
        body: JSON.stringify({
          label: newChildLabel,
          internal_path: newChildPath || '/services',
          parent_id: column.id,
          display_order: column.children.length,
        }),
      });
      setNewChildLabel('');
      setNewChildPath('');
      toast.success('Added');
      onReload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to add link');
    }
  }

  return (
    <div style={adminCard} className="p-4">
      <div className="flex flex-wrap items-center gap-2.5 mb-3">
        <input style={{ ...inputStyle, width: 46, textAlign: 'center' }} value={icon} onChange={(e) => setIcon(e.target.value)} />
        <input style={{ ...inputStyle, flex: 1, minWidth: 200 }} value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="flex items-center gap-1">
          <button type="button" disabled={index === 0} onClick={() => reorder('services_mega', move([column], 0, -1), onReload)} style={{ color: adminColors.textMuted }}>
            <ArrowUp size={16} />
          </button>
          <button type="button" disabled={index === total - 1} onClick={() => reorder('services_mega', move([column], 0, 1), onReload)} style={{ color: adminColors.textMuted }}>
            <ArrowDown size={16} />
          </button>
          <button type="button" onClick={() => saveItem(column.id, { label: title, icon, mega_column: title })} style={{ color: adminColors.accentBlue }}>
            <Save size={16} />
          </button>
          <button type="button" onClick={() => deleteItem(column.id, onReload)} style={{ color: adminColors.danger }}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid gap-1.5 pl-2">
        {column.children.map((child, ci) => (
          <MegaChildRow key={child.id} child={child} index={ci} total={column.children.length} onReload={onReload} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-2.5 pl-2">
        <input style={{ ...inputStyle, width: 160 }} placeholder="Link label" value={newChildLabel} onChange={(e) => setNewChildLabel(e.target.value)} />
        <input style={{ ...inputStyle, width: 140 }} placeholder="/path" value={newChildPath} onChange={(e) => setNewChildPath(e.target.value)} />
        <button type="button" onClick={addChild} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[12.5px]" style={adminPrimaryBtn}>
          <Plus size={12} /> Add link
        </button>
      </div>
    </div>
  );
}

function MegaChildRow({ child, index, total, onReload }: { child: MenuItem; index: number; total: number; onReload: () => void }) {
  const [label, setLabel] = useState(child.label);
  const [path, setPath] = useState(child.internal_path ?? '');

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input style={{ ...inputStyle, width: 160 }} value={label} onChange={(e) => setLabel(e.target.value)} />
      <input style={{ ...inputStyle, width: 140 }} value={path} onChange={(e) => setPath(e.target.value)} />
      <div className="flex items-center gap-1">
        <button type="button" disabled={index === 0} onClick={() => reorder('services_mega', move([child], 0, -1), onReload)} style={{ color: adminColors.textMuted }}>
          <ArrowUp size={14} />
        </button>
        <button type="button" disabled={index === total - 1} onClick={() => reorder('services_mega', move([child], 0, 1), onReload)} style={{ color: adminColors.textMuted }}>
          <ArrowDown size={14} />
        </button>
        <button type="button" onClick={() => saveItem(child.id, { label, internal_path: path, url_type: 'internal', parent_id: child.parent_id })} style={{ color: adminColors.accentBlue }}>
          <Save size={14} />
        </button>
        <button type="button" onClick={() => deleteItem(child.id, onReload)} style={{ color: adminColors.danger }}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function MegaMenuEditor() {
  const { items, loading, reload } = useMenu('services_mega');
  const [newColumn, setNewColumn] = useState('');

  async function addColumn() {
    if (!newColumn.trim()) return;
    try {
      await adminFetch('/api/admin/menus/services_mega/items', {
        method: 'POST',
        body: JSON.stringify({ label: newColumn, mega_column: newColumn, display_order: items.length }),
      });
      setNewColumn('');
      toast.success('Column added');
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to add column');
    }
  }

  if (loading) return <div style={{ color: adminColors.textMuted }}>Loading…</div>;

  return (
    <div className="grid gap-3.5">
      {items.map((col, i) => (
        <MegaColumnEditor key={col.id} column={col} index={i} total={items.length} onReload={reload} />
      ))}
      <div style={{ ...adminCard, borderStyle: 'dashed' }} className="p-3.5 flex items-center gap-2.5">
        <input style={{ ...inputStyle, flex: 1 }} placeholder="New column title" value={newColumn} onChange={(e) => setNewColumn(e.target.value)} />
        <button type="button" onClick={addColumn} className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[13.5px]" style={adminPrimaryBtn}>
          <Plus size={14} /> Add column
        </button>
      </div>
    </div>
  );
}

export default function Menus() {
  return (
    <div className="grid gap-8 max-w-[720px]">
      <div>
        <div className="text-[13px] font-bold uppercase tracking-[.08em] mb-3" style={{ color: adminColors.textMuted }}>
          Primary navigation
        </div>
        <PrimaryMenuEditor />
      </div>
      <div>
        <div className="text-[13px] font-bold uppercase tracking-[.08em] mb-3" style={{ color: adminColors.textMuted }}>
          Services mega menu
        </div>
        <MegaMenuEditor />
      </div>
    </div>
  );
}
