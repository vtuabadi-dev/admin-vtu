"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Bold, Italic, List, ListOrdered, Link, Heading1, Heading2, Undo, Redo, Eye } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: string;
}

export function RichTextEditor({ value, onChange, placeholder = "Tulis konten...", readOnly = false, minHeight = "300px" }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const initializedRef = useRef(false);

  // One-time initialization: set content from props on mount
  useEffect(() => {
    if (editorRef.current && !initializedRef.current) {
      editorRef.current.innerHTML = value;
      initializedRef.current = true;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When value changes externally (e.g. from parent state after loading from API),
  // update the editor content ONLY if we're not currently editing
  useEffect(() => {
    if (editorRef.current && initializedRef.current && value !== editorRef.current.innerHTML) {
      // Only update if editor doesn't have focus (external change)
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value;
      }
    }
  }, [value]);

  const emitChange = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const execCommand = useCallback((command: string, val?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, val);
    emitChange();
  }, [emitChange]);

  const handleLink = () => {
    const url = prompt("Masukkan URL:");
    if (url) execCommand("createLink", url);
  };

  const toolbarButtons = [
    { icon: Undo, command: "undo", label: "Undo" },
    { icon: Redo, command: "redo", label: "Redo" },
    { type: "divider" as const },
    { icon: Heading1, command: "formatBlock", value: "h2", label: "Heading 1" },
    { icon: Heading2, command: "formatBlock", value: "h3", label: "Heading 2" },
    { type: "divider" as const },
    { icon: Bold, command: "bold", label: "Bold" },
    { icon: Italic, command: "italic", label: "Italic" },
    { type: "divider" as const },
    { icon: List, command: "insertUnorderedList", label: "Bullet List" },
    { icon: ListOrdered, command: "insertOrderedList", label: "Numbered List" },
    { type: "divider" as const },
    { icon: Link, action: handleLink, label: "Link" },
  ];

  // When switching to preview mode, update parent state with current HTML
  useEffect(() => {
    if (showPreview) emitChange();
  }, [showPreview]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden ${readOnly ? "" : "focus-within:ring-2 focus-within:ring-blue-500"}`}>
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50 flex-wrap">
          {toolbarButtons.map((btn, i) => {
            if ("type" in btn && btn.type === "divider") {
              return <div key={i} className="w-px h-5 bg-gray-200 mx-1" />;
            }
            const Icon = "icon" in btn ? btn.icon : null;
            return (
              <button
                key={i}
                type="button"
                onMouseDown={(e) => {
                  // Prevent focus loss before execCommand runs
                  e.preventDefault();
                  if ("command" in btn) {
                    execCommand(btn.command!, btn.value);
                  } else {
                    (btn as any).action();
                  }
                }}
                className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
                title={"label" in btn ? btn.label : ""}
              >
                {Icon && <Icon className="w-4 h-4" />}
              </button>
            );
          })}
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`p-1.5 rounded text-xs flex items-center gap-1 ${showPreview ? "bg-blue-100 text-blue-700" : "hover:bg-gray-200 text-gray-500"}`}
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editor / Preview */}
      {showPreview && !readOnly ? (
        <div
          className="p-4 prose prose-sm max-w-none"
          dir="ltr"
          style={{ minHeight, direction: "ltr", textAlign: "left" }}
          dangerouslySetInnerHTML={{ __html: value || "<p class='text-gray-400 italic'>Kosong</p>" }}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable={!readOnly}
          dir="ltr"
          suppressContentEditableWarning
          className={`p-4 text-sm outline-none text-left ${readOnly ? "" : "cursor-text"}`}
          style={{ minHeight, direction: "ltr", textAlign: "left" }}
          onInput={emitChange}
          data-placeholder={placeholder}
        />
      )}

      <style jsx>{`
        [contentEditable=true]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          font-style: italic;
        }
        [contentEditable=true] ol {
          list-style-type: decimal;
          padding-left: 1.5em;
        }
        [contentEditable=true] ul {
          list-style-type: disc;
          padding-left: 1.5em;
        }
        [contentEditable=true] ol li, [contentEditable=true] ul li {
          display: list-item;
        }
      `}</style>
    </div>
  );
}
