"use client";

/**
 * InlineTextareaField — Pane 4 編集 UI の「複数行 textarea」プリミティブ。
 *
 * shadcn `<Textarea>` をラップし、Lab v3 で確定した規律で編集体験を統一する:
 *   - 常に `<Textarea>` 表示（Type-direct、ADR-0014）
 *   - `bg-card` で周囲（bg-background）より明るく「手前」感を出す
 *   - `field-sizing: content`（Tailwind v4 / shadcn v4 の textarea デフォルト）で内容に応じて自動リサイズ
 *   - 保存: blur で onSave 発火（値が変わっていれば）。Cmd+Enter で blur
 *   - キャンセル: Esc で元の値に戻して blur
 *
 * 雛形では「職務経歴」「志望動機」のような長文項目で再利用。
 */

import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useRef } from "react";

export type InlineTextareaFieldProps = {
  /** 現在の値（空文字で「未設定」placeholder 表示） */
  value: string;
  /** 値が変わって blur した時に呼ばれる */
  onSave: (v: string) => void;
  /** 値が変わるたびに呼ばれる（保存ボタン用） */
  onChange?: (v: string) => void;
  /** スクリーンリーダー向けラベル */
  ariaLabel: string;
  /** 空のときの placeholder。デフォルト "未設定" */
  placeholder?: string;
  /** 追加 CSS クラス */
  className?: string;
};

export function InlineTextareaField({
  value,
  onSave,
  onChange,
  ariaLabel,
  placeholder,
  className,
}: InlineTextareaFieldProps) {
  const [localValue, setLocalValue] = useState(value);
  /** フォーカス開始時の値。blur 時にここと比較して保存する */
  const committedAtFocusRef = useRef(value);
  const isFocusedRef = useRef(false);

  // 外部から value が変化した時（タスク切替・保存後の同期など）に表示を同期
  useEffect(() => {
    if (isFocusedRef.current) return;
    setLocalValue(value);
    committedAtFocusRef.current = value;
  }, [value]);

  return (
    <Textarea
      value={localValue}
      placeholder={placeholder ?? "未設定"}
      aria-label={ariaLabel}
      onFocus={() => {
        isFocusedRef.current = true;
        committedAtFocusRef.current = value;
      }}
      onChange={(e) => {
        setLocalValue(e.target.value);
        onChange?.(e.target.value);
      }}
      onBlur={(e) => {
        isFocusedRef.current = false;
        const next = e.target.value;
        if (next !== committedAtFocusRef.current) onSave(next);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          (e.target as HTMLTextAreaElement).blur();
        } else if (e.key === "Escape") {
          setLocalValue(value);
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
      className={cn("min-h-24 bg-card leading-relaxed whitespace-pre-line", className)}
    />
  );
}
