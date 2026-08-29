import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2, Plus, Save } from 'lucide-react';
import { adminFetch, ApiError } from '../lib/api';
import { adminCard, adminColors, adminPrimaryBtn } from '../adminTheme';
import { useConfirmDialog } from '../components/ConfirmDialog';

type FooterLink = { id: number; label: string; url: string; display_order: number };
type FooterSection = { id: number; title: string; display_order: number; is_visible: number | boolean; links: FooterLink[] };

const inputStyle: React.CSSProperties = {
  padding: '8px 11px',
  borderRadius: 8,
  border: `1px solid ${adminColors.cardBorder}`,
  fontSize: 13.5,
};

function LinkRow({ link, onReload }: { link: FooterLink; onReload: () => void }) {
  const [label, setLabel] = useState(link.label);
  const [url, setUrl] = useState(link.url);
  const { confirm, dialog } = useConfirmDialog();

  async function save() {
    try {
      await adminFetch(`/api/admin/footer/links/${link.id}`, { method: 'PUT', body: JSON.stringify({ label, url }) });
      toast.success('Saved');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save');
    }
  }

  function remove() {
    confirm({
      title: 'Delete this footer link?',
      variant: 'destructive',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await adminFetch(`/api/admin/footer/links/${link.id}`, { method: 'DELETE' });
        toast.success('Deleted');
        onReload();
      },
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {dialog}
      <input style={{ ...inputStyle, width: 160 }} value={label} onChange={(e) => setLabel(e.target.value)} />
      <input style={{ ...inputStyle, width: 160 }} value={url} onChange={(e) => setUrl(e.target.value)} />
      <button type="button" onClick={save} style={{ color: adminColors.accentBlue }}><Save size={14} /></button>
      <button type="button" onClick={remove} style={{ color: adminColors.danger }}><Trash2 size={14} /></button>
    </div>
  );
}

function SectionCard({ section, onReload }: { section: FooterSection; onReload: () => void }) {
  const [title, setTitle] = useState(section.title);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const { confirm, dialog } = useConfirmDialog();

  async function saveTitle() {
    try {
      await adminFetch(`/api/admin/footer/sections/${section.id}`, {
        method: 'PUT',
        body: JSON.stringify({ title, display_order: section.display_order, is_visible: section.is_visible }),
      });
      toast.success('Saved');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save');
    }
  }

  function removeSection() {
    confirm({
      title: `Delete the "${section.title}" footer section?`,
      description: 'All links inside this section will be deleted too.',
      variant: 'destructive',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await adminFetch(`/api/admin/footer/sections/${section.id}`, { method: 'DELETE' });
        toast.success('Deleted');
        onReload();
      },
    });
  }

  async function addLink() {
    if (!newLabel.trim() || !newUrl.trim()) return;
    try {
      await adminFetch('/api/admin/footer/links', {
        method: 'POST',
        body: JSON.stringify({ footer_section_id: section.id, label: newLabel, url: newUrl, display_order: section.links.length }),
      });
      setNewLabel('');
      setNewUrl('');
      toast.success('Added');
      onReload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to add link');
    }
  }

  return (
    <div style={adminCard} className="p-4">
      {dialog}
      <div className="flex items-center gap-2.5 mb-3">
        <input style={{ ...inputStyle, flex: 1, fontWeight: 700 }} value={title} onChange={(e) => setTitle(e.target.value)} />
        <button type="button" onClick={saveTitle} style={{ color: adminColors.accentBlue }}><Save size={16} /></button>
        <button type="button" onClick={removeSection} style={{ color: adminColors.danger }}><Trash2 size={16} /></button>
      </div>
      <div className="grid gap-1.5 pl-2">
        {section.links.map((link) => (
          <LinkRow key={link.id} link={link} onReload={onReload} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-2.5 pl-2">
        <input style={{ ...inputStyle, width: 160 }} placeholder="Label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
        <input style={{ ...inputStyle, width: 160 }} placeholder="/url" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
        <button type="button" onClick={addLink} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[12.5px]" style={adminPrimaryBtn}>
          <Plus size={12} /> Add link
        </button>
      </div>
    </div>
  );
}

export default function FooterAdmin() {
  const [sections, setSections] = useState<FooterSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSection, setNewSection] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    return adminFetch<{ sections: FooterSection[] }>('/api/admin/footer')
      .then((d) => setSections(d.sections))
      .catch(() => toast.error('Failed to load footer'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addSection() {
    if (!newSection.trim()) return;
    try {
      await adminFetch('/api/admin/footer/sections', {
        method: 'POST',
        body: JSON.stringify({ title: newSection, display_order: sections.length }),
      });
      setNewSection('');
      toast.success('Section added');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to add section');
    }
  }

  if (loading) return <div style={{ color: adminColors.textMuted }}>Loading…</div>;

  return (
    <div className="grid gap-3.5 w-full">
      {sections.map((section) => (
        <SectionCard key={section.id} section={section} onReload={load} />
      ))}
      <div style={{ ...adminCard, borderStyle: 'dashed' }} className="p-3.5 flex items-center gap-2.5">
        <input style={{ ...inputStyle, flex: 1 }} placeholder="New section title" value={newSection} onChange={(e) => setNewSection(e.target.value)} />
        <button type="button" onClick={addSection} className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[13.5px]" style={adminPrimaryBtn}>
          <Plus size={14} /> Add section
        </button>
      </div>
    </div>
  );
}
