"use client";

import { Button } from "@babascamera/ui";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Code, Heading2, Italic, List, ListOrdered, Quote } from "lucide-react";

export function RichTextEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false,
    editorProps: { attributes: { class: "min-h-52 px-4 py-3 text-sm outline-none" } },
    onUpdate: ({ editor: current }) => onChange(current.isEmpty ? "" : current.getHTML()),
  });
  if (!editor) return <div className="h-60 animate-pulse rounded-xl bg-slate-100" />;
  const controls = [
    ["Bold", Bold, () => editor.chain().focus().toggleBold().run()],
    ["Italic", Italic, () => editor.chain().focus().toggleItalic().run()],
    ["Heading", Heading2, () => editor.chain().focus().toggleHeading({ level: 2 }).run()],
    ["Bullet list", List, () => editor.chain().focus().toggleBulletList().run()],
    ["Numbered list", ListOrdered, () => editor.chain().focus().toggleOrderedList().run()],
    ["Quote", Quote, () => editor.chain().focus().toggleBlockquote().run()],
    ["Code", Code, () => editor.chain().focus().toggleCodeBlock().run()],
  ] as const;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-amber-400">
      <div className="flex flex-wrap gap-1 border-b bg-slate-50 p-2">
        {controls.map(([label, Icon, run]) => (
          <Button key={label} type="button" variant="ghost" size="icon" title={label} aria-label={label} onClick={run}>
            <Icon className="size-4" />
          </Button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
