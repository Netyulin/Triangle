"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import Placeholder from "@tiptap/extension-placeholder"
import { useCallback, useEffect, useState, type ReactNode } from "react"
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Link2,
  ImagePlus,
  Undo,
  Redo,
} from "lucide-react"

type TiptapEditorProps = {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  uploadImage?: (file: File) => Promise<string>
  className?: string
  minHeight?: string
}

interface ToolbarButtonProps {
  icon: ReactNode
  isActive?: boolean
  onClick: () => void
  title?: string
}

function ToolbarButton({ icon, isActive, onClick, title }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border text-sm transition-all ${
        isActive
          ? "border-accent/25 bg-accent/10 text-accent shadow-[0_10px_24px_-18px_rgba(14,165,233,0.6)]"
          : "border-transparent bg-background/70 text-muted-foreground hover:border-border hover:bg-secondary/70 hover:text-foreground"
      }`}
    >
      {icon}
    </button>
  )
}

function extractImageFiles(clipboardData: DataTransfer): File[] {
  const files: File[] = []

  for (let i = 0; i < clipboardData.items.length; i++) {
    const item = clipboardData.items[i]
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile()
      if (file) {
        files.push(file)
      }
    }
  }

  return files
}

export function TiptapEditor({
  content,
  onChange,
  placeholder = "开始输入内容...",
  uploadImage,
  className = "",
  minHeight = "300px",
}: TiptapEditorProps) {
  const [isPasting, setIsPasting] = useState(false)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
        link: {
          openOnClick: false,
          HTMLAttributes: { class: "tiptap-link" },
        },
      }),
      Image.configure({
        HTMLAttributes: { class: "tiptap-image" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: content || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none`,
        style: `min-height: ${minHeight};`,
      },
      handlePaste: (view, event) => {
        if (!uploadImage) return false

        const clipboardData = event.clipboardData
        if (!clipboardData) return false

        const imageFiles = extractImageFiles(clipboardData)
        if (!imageFiles.length) return false

        event.preventDefault()
        setIsPasting(true)

        ;(async () => {
          try {
            for (const file of imageFiles) {
              const imageUrl = await uploadImage(file)
              const { schema } = view.state
              const imageNode = schema.nodes.image.create({ src: imageUrl })
              const transaction = view.state.tr.replaceSelectionWith(imageNode)
              view.dispatch(transaction)
            }
          } catch (error) {
            console.error("Failed to upload pasted image:", error)
          } finally {
            setIsPasting(false)
          }
        })()

        return true
      },
    },
  })

  useEffect(() => {
    if (!editor || content === undefined || content === null) return
    const currentHtml = editor.getHTML().trim()
    if (!currentHtml || content.trim() !== currentHtml.trim()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  const addImage = useCallback(async () => {
    if (!editor) return

    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return

      const imageUrl = uploadImage ? await uploadImage(file) : URL.createObjectURL(file)
      editor.chain().focus().setImage({ src: imageUrl }).run()
    }
    input.click()
  }, [editor, uploadImage])

  const addLink = useCallback(() => {
    if (!editor) return

    const url = window.prompt("请输入链接地址")
    if (!url) return

    editor.chain().focus().setLink({ href: url }).run()
  }, [editor])

  if (!editor) return null

  return (
    <div className={`admin-panel overflow-hidden ${className}`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-secondary/50 p-3">
        <ToolbarButton icon={<Bold className="h-4 w-4" />} isActive={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="加粗" />
        <ToolbarButton icon={<Italic className="h-4 w-4" />} isActive={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="斜体" />
        <ToolbarButton icon={<Strikethrough className="h-4 w-4" />} isActive={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="删除线" />
        <ToolbarButton icon={<Code className="h-4 w-4" />} isActive={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} title="行内代码" />
        <div className="mx-1 h-6 w-px bg-border" />
        <ToolbarButton icon={<Heading1 className="h-4 w-4" />} isActive={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="一级标题" />
        <ToolbarButton icon={<Heading2 className="h-4 w-4" />} isActive={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="二级标题" />
        <div className="mx-1 h-6 w-px bg-border" />
        <ToolbarButton icon={<List className="h-4 w-4" />} isActive={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="无序列表" />
        <ToolbarButton icon={<ListOrdered className="h-4 w-4" />} isActive={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="有序列表" />
        <ToolbarButton icon={<Quote className="h-4 w-4" />} isActive={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="引用" />
        <div className="mx-1 h-6 w-px bg-border" />
        <ToolbarButton icon={<Link2 className="h-4 w-4" />} isActive={editor.isActive("link")} onClick={addLink} title="插入链接" />
        <ToolbarButton icon={<ImagePlus className="h-4 w-4" />} onClick={addImage} title="插入图片" />
        <div className="flex-1" />
        <ToolbarButton icon={<Undo className="h-4 w-4" />} onClick={() => editor.chain().focus().undo().run()} title="撤销" />
        <ToolbarButton icon={<Redo className="h-4 w-4" />} onClick={() => editor.chain().focus().redo().run()} title="重做" />
      </div>

      <div className="bg-background p-4">
        <EditorContent editor={editor} />
        {isPasting ? <p className="mt-3 text-xs text-muted-foreground">正在处理粘贴的图片...</p> : null}
      </div>
    </div>
  )
}

