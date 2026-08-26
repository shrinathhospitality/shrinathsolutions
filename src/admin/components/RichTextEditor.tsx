import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Bold, Italic, List, ListOrdered, Heading2, Heading3, Quote, Link as LinkIcon } from 'lucide-react';
import { adminColors } from '../adminTheme';

export default function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false })],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return null;

  const btn = (active: boolean): React.CSSProperties => ({
    padding: '6px 9px',
    borderRadius: 8,
    color: active ? '#fff' : adminColors.textMuted,
    background: active ? adminColors.accentBlue : 'transparent',
  });

  return (
    <div style={{ border: `1px solid ${adminColors.cardBorder}`, borderRadius: 10, overflow: 'hidden' }}>
      <div className="flex flex-wrap gap-1 p-2" style={{ borderBottom: `1px solid ${adminColors.cardBorder}`, background: '#f8f9fc' }}>
        <button type="button" style={btn(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={14} /></button>
        <button type="button" style={btn(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={14} /></button>
        <button type="button" style={btn(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={14} /></button>
        <button type="button" style={btn(editor.isActive('heading', { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={14} /></button>
        <button type="button" style={btn(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={14} /></button>
        <button type="button" style={btn(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={14} /></button>
        <button type="button" style={btn(editor.isActive('blockquote'))} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={14} /></button>
        <button
          type="button"
          style={btn(editor.isActive('link'))}
          onClick={() => {
            const url = window.prompt('Link URL');
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
        >
          <LinkIcon size={14} />
        </button>
      </div>
      <div className="px-4 py-3 rich-text-editor-body">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
