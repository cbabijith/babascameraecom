"use client";

import { Button } from "@babascamera/ui";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  "aria-invalid"?: boolean;
};

export function RichTextEditor({
  value,
  onChange,
  "aria-invalid": ariaInvalid,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-slate min-h-56 max-w-none px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
        "aria-label": "Product description",
        "aria-invalid": ariaInvalid ? "true" : "false",
      },
    },
    onUpdate({ editor: currentEditor }) {
      onChange(currentEditor.isEmpty ? "" : currentEditor.getHTML());
    },
  });

  if (!editor) {
    return <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />;
  }

  const controls = [
    { label: "Bold", icon: Bold, active: editor.isActive("bold"), run: () => editor.chain().focus().toggleBold().run() },
    { label: "Italic", icon: Italic, active: editor.isActive("italic"), run: () => editor.chain().focus().toggleItalic().run() },
    { label: "Strike", icon: Strikethrough, active: editor.isActive("strike"), run: () => editor.chain().focus().toggleStrike().run() },
    { label: "Heading 2", icon: Heading2, active: editor.isActive("heading", { level: 2 }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Heading 3", icon: Heading3, active: editor.isActive("heading", { level: 3 }), run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: "Bullet list", icon: List, active: editor.isActive("bulletList"), run: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Numbered list", icon: ListOrdered, active: editor.isActive("orderedList"), run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Quote", icon: Quote, active: editor.isActive("blockquote"), run: () => editor.chain().focus().toggleBlockquote().run() },
    { label: "Code block", icon: Code, active: editor.isActive("codeBlock"), run: () => editor.chain().focus().toggleCodeBlock().run() },
  ] as const;

  return (
    <div
      className="overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-amber-400 focus-within:ring-4 focus-within:ring-amber-100"
      data-invalid={ariaInvalid || undefined}
    >
      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2">
        {controls.map(({ label, icon: Icon, active, run }) => (
          <Button
            key={label}
            type="button"
            size="icon"
            variant={active ? "default" : "ghost"}
            aria-label={label}
            aria-pressed={active}
            onClick={run}
          >
            <Icon className="size-4" />
          </Button>
        ))}
        <span className="mx-1 w-px bg-slate-200" aria-hidden="true" />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Undo"
          disabled={!editor.can().chain().focus().undo().run()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Redo"
          disabled={!editor.can().chain().focus().redo().run()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="size-4" />
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

