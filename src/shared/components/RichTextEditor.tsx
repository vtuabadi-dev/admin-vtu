"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Link,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Indent,
  Outdent,
  Undo,
  Redo,
  Eye,
  RemoveFormatting,
  Quote,
  Minus,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Tulis dokumen di sini... (Gunakan Tab / Shift+Tab untuk indentasi list)",
  readOnly = false,
  minHeight = "350px",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [activeStates, setActiveStates] = useState<Record<string, boolean>>({});
  const initializedRef = useRef(false);

  // One-time initialization: set content from props on mount
  useEffect(() => {
    if (editorRef.current && !initializedRef.current) {
      editorRef.current.innerHTML = value || "";
      initializedRef.current = true;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // External sync when not focused
  useEffect(() => {
    if (editorRef.current && initializedRef.current && value !== editorRef.current.innerHTML) {
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value]);

  const emitChange = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  // Update active state of toolbar formatting buttons
  const updateActiveStates = useCallback(() => {
    if (!editorRef.current || readOnly) return;
    const states: Record<string, boolean> = {};

    try {
      states.bold = document.queryCommandState("bold");
      states.italic = document.queryCommandState("italic");
      states.underline = document.queryCommandState("underline");
      states.strikethrough = document.queryCommandState("strikeThrough");
      states.insertUnorderedList = document.queryCommandState("insertUnorderedList");
      states.insertOrderedList = document.queryCommandState("insertOrderedList");
      states.justifyLeft = document.queryCommandState("justifyLeft");
      states.justifyCenter = document.queryCommandState("justifyCenter");
      states.justifyRight = document.queryCommandState("justifyRight");
      states.justifyFull = document.queryCommandState("justifyFull");
    } catch {
      /* ignore DOM query errors */
    }

    setActiveStates(states);
  }, [readOnly]);

  const execCommand = useCallback(
    (command: string, val?: string) => {
      if (!editorRef.current) return;
      editorRef.current.focus();
      document.execCommand(command, false, val);
      emitChange();
      updateActiveStates();
    },
    [emitChange, updateActiveStates]
  );

  const handleLink = () => {
    const url = prompt("Masukkan URL tautan:");
    if (url) execCommand("createLink", url);
  };

  // Keyboard ergonomics: Tab / Shift+Tab for Word-like list indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        execCommand("outdent");
      } else {
        execCommand("indent");
      }
    }
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      if (document.activeElement === editorRef.current) {
        updateActiveStates();
      }
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [updateActiveStates]);

  useEffect(() => {
    if (showPreview) emitChange();
  }, [showPreview]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={`border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm transition-all ${
        readOnly ? "" : "focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
      }`}
    >
      {/* ── Word-style Toolbar ── */}
      {!readOnly && (
        <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200 bg-gray-50/90 flex-wrap text-gray-700 select-none">
          {/* Undo / Redo */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCommand("undo"); }}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCommand("redo"); }}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-gray-300 mx-1" />

          {/* Heading / Block Selector */}
          <select
            onChange={(e) => {
              const val = e.target.value;
              if (val === "p") {
                execCommand("formatBlock", "p");
              } else if (val === "h1") {
                execCommand("formatBlock", "h1");
              } else if (val === "h2") {
                execCommand("formatBlock", "h2");
              } else if (val === "h3") {
                execCommand("formatBlock", "h3");
              } else if (val === "blockquote") {
                execCommand("formatBlock", "blockquote");
              }
            }}
            className="h-8 text-xs font-medium border border-gray-300 rounded px-2 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            defaultValue="p"
            title="Gaya Teks (Heading / Paragraf)"
          >
            <option value="p">Paragraf Normal</option>
            <option value="h1">Judul Utama (H1)</option>
            <option value="h2">Sub Judul (H2)</option>
            <option value="h3">Sub-sub Judul (H3)</option>
            <option value="blockquote">Kutipan (Blockquote)</option>
          </select>

          <div className="w-px h-5 bg-gray-300 mx-1" />

          {/* Text Formatting */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCommand("bold"); }}
            className={`p-1.5 rounded transition-colors ${
              activeStates.bold ? "bg-blue-100 text-blue-700 font-bold" : "hover:bg-gray-200 text-gray-700"
            }`}
            title="Tebal / Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCommand("italic"); }}
            className={`p-1.5 rounded transition-colors ${
              activeStates.italic ? "bg-blue-100 text-blue-700 italic" : "hover:bg-gray-200 text-gray-700"
            }`}
            title="Miring / Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCommand("underline"); }}
            className={`p-1.5 rounded transition-colors ${
              activeStates.underline ? "bg-blue-100 text-blue-700 underline" : "hover:bg-gray-200 text-gray-700"
            }`}
            title="Garis Bawah / Underline (Ctrl+U)"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCommand("strikeThrough"); }}
            className={`p-1.5 rounded transition-colors ${
              activeStates.strikethrough ? "bg-blue-100 text-blue-700 line-through" : "hover:bg-gray-200 text-gray-700"
            }`}
            title="Coret / Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-gray-300 mx-1" />

          {/* Alignment */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCommand("justifyLeft"); }}
            className={`p-1.5 rounded transition-colors ${
              activeStates.justifyLeft ? "bg-blue-100 text-blue-700" : "hover:bg-gray-200 text-gray-700"
            }`}
            title="Rata Kiri (Align Left)"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCommand("justifyCenter"); }}
            className={`p-1.5 rounded transition-colors ${
              activeStates.justifyCenter ? "bg-blue-100 text-blue-700" : "hover:bg-gray-200 text-gray-700"
            }`}
            title="Rata Tengah (Align Center)"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCommand("justifyRight"); }}
            className={`p-1.5 rounded transition-colors ${
              activeStates.justifyRight ? "bg-blue-100 text-blue-700" : "hover:bg-gray-200 text-gray-700"
            }`}
            title="Rata Kanan (Align Right)"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCommand("justifyFull"); }}
            className={`p-1.5 rounded transition-colors ${
              activeStates.justifyFull ? "bg-blue-100 text-blue-700" : "hover:bg-gray-200 text-gray-700"
            }`}
            title="Rata Kiri Kanan (Justify)"
          >
            <AlignJustify className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-gray-300 mx-1" />

          {/* Lists */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCommand("insertUnorderedList"); }}
            className={`p-1.5 rounded transition-colors ${
              activeStates.insertUnorderedList ? "bg-blue-100 text-blue-700 font-semibold" : "hover:bg-gray-200 text-gray-700"
            }`}
            title="Poin List (Bullet List)"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCommand("insertOrderedList"); }}
            className={`p-1.5 rounded transition-colors ${
              activeStates.insertOrderedList ? "bg-blue-100 text-blue-700 font-semibold" : "hover:bg-gray-200 text-gray-700"
            }`}
            title="Nomor List (Numbered List)"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          {/* Indent / Outdent */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCommand("outdent"); }}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-700 transition-colors"
            title="Geser Kiri / Outdent (Shift+Tab)"
          >
            <Outdent className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCommand("indent"); }}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-700 transition-colors"
            title="Geser Kanan / Indent (Tab)"
          >
            <Indent className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-gray-300 mx-1" />

          {/* Inserts & Clear */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); handleLink(); }}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-700 transition-colors"
            title="Sisipkan Tautan (Link)"
          >
            <Link className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCommand("insertHorizontalRule"); }}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-700 transition-colors"
            title="Garis Pembatas (Horizontal Line)"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCommand("removeFormat"); }}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-700 transition-colors"
            title="Hapus Format (Clear Formatting)"
          >
            <RemoveFormatting className="w-4 h-4" />
          </button>

          <div className="flex-1" />

          {/* Mode Preview Toggle */}
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
              showPreview ? "bg-blue-600 text-white shadow-sm" : "hover:bg-gray-200 text-gray-600"
            }`}
            title="Tinjauan Tampilan (Preview)"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showPreview ? "Edit Mode" : "Preview"}</span>
          </button>
        </div>
      )}

      {/* ── Editor Workspace / Preview Container ── */}
      {showPreview && !readOnly ? (
        <div
          className="p-6 rich-text-content text-gray-800 text-sm overflow-y-auto"
          dir="ltr"
          style={{ minHeight }}
          dangerouslySetInnerHTML={{ __html: value || "<p class='text-gray-400 italic'>Konten masih kosong.</p>" }}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable={!readOnly}
          dir="ltr"
          suppressContentEditableWarning
          className={`p-6 rich-text-content text-gray-800 text-sm outline-none text-left overflow-y-auto ${
            readOnly ? "" : "cursor-text"
          }`}
          style={{ minHeight }}
          onInput={emitChange}
          onKeyUp={updateActiveStates}
          onMouseUp={updateActiveStates}
          onKeyDown={handleKeyDown}
          data-placeholder={placeholder}
        />
      )}

      {/* ── Standard CSS Overrides (Ensures Lists & Typography Render Word-Like) ── */}
      <style jsx global>{`
        .rich-text-content[contenteditable="true"]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          font-style: italic;
          pointer-events: none;
          display: block;
        }

        /* Unordered Lists (Bullets) */
        .rich-text-content ul {
          list-style-type: disc !important;
          margin-top: 0.5rem !important;
          margin-bottom: 0.5rem !important;
          padding-left: 2rem !important;
        }
        .rich-text-content ul ul {
          list-style-type: circle !important;
        }
        .rich-text-content ul ul ul {
          list-style-type: square !important;
        }

        /* Ordered Lists (Numbered) */
        .rich-text-content ol {
          list-style-type: decimal !important;
          margin-top: 0.5rem !important;
          margin-bottom: 0.5rem !important;
          padding-left: 2rem !important;
        }
        .rich-text-content ol ol {
          list-style-type: lower-alpha !important;
        }

        /* List Items */
        .rich-text-content li {
          display: list-item !important;
          list-style-position: outside !important;
          margin-bottom: 0.25rem !important;
          line-height: 1.6 !important;
        }

        /* Headings */
        .rich-text-content h1 {
          font-size: 1.75rem !important;
          font-weight: 700 !important;
          color: #111827 !important;
          margin-top: 1.25rem !important;
          margin-bottom: 0.5rem !important;
          line-height: 1.3 !important;
        }
        .rich-text-content h2 {
          font-size: 1.375rem !important;
          font-weight: 600 !important;
          color: #1f2937 !important;
          margin-top: 1rem !important;
          margin-bottom: 0.375rem !important;
          line-height: 1.35 !important;
        }
        .rich-text-content h3 {
          font-size: 1.125rem !important;
          font-weight: 600 !important;
          color: #374151 !important;
          margin-top: 0.875rem !important;
          margin-bottom: 0.25rem !important;
          line-height: 1.4 !important;
        }

        /* Paragraphs */
        .rich-text-content p {
          margin-bottom: 0.6em !important;
          line-height: 1.6 !important;
        }

        /* Blockquotes */
        .rich-text-content blockquote {
          border-left: 4px solid #3b82f6 !important;
          padding-left: 1rem !important;
          margin-top: 0.75rem !important;
          margin-bottom: 0.75rem !important;
          color: #4b5563 !important;
          font-style: italic !important;
          background-color: #f9fafb !important;
          padding-top: 0.5rem !important;
          padding-bottom: 0.5rem !important;
          border-radius: 0 0.375rem 0.375rem 0 !important;
        }

        /* Links & HR */
        .rich-text-content a {
          color: #2563eb !important;
          text-decoration: underline !important;
        }
        .rich-text-content hr {
          border: 0 !important;
          border-top: 1px solid #e5e7eb !important;
          margin-top: 1.25rem !important;
          margin-bottom: 1.25rem !important;
        }
      `}</style>
    </div>
  );
}

