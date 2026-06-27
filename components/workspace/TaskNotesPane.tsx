"use client";

/**
 * Pane 4: 備考メモのみ（次の一手は書かない）。
 */

import { type Task } from "@/lib/schema";
import { Pane4Toggle } from "@/components/workspace/Pane4Toggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { InlineTextareaField, SectionLabel } from "@/components/primitives";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type TaskNotesPaneProps = {
  task: Task | null;
  pane4Open: boolean;
  onTogglePane4: () => void;
  onUpdateNotes: (notes: string[]) => void;
};

export function TaskNotesPane({
  task,
  pane4Open,
  onTogglePane4,
  onUpdateNotes,
}: TaskNotesPaneProps) {
  const isOpen = !!task && pane4Open;

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-l border-border bg-background",
        "transition-[width] duration-300 ease-in-out",
        isOpen ? "w-[320px]" : "w-10",
      )}
      aria-label="備考"
    >
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border">
        {isOpen && (
          <h2 className="min-w-0 flex-1 truncate pl-3 text-sm font-semibold text-foreground">
            備考
          </h2>
        )}
        <div className={cn("flex shrink-0 items-center", isOpen ? "pr-2" : "w-full justify-center")}>
          <Pane4Toggle
            open={isOpen}
            onToggle={task ? onTogglePane4 : () => {}}
            disabled={!task}
          />
        </div>
      </header>

      {isOpen && (
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-4 p-4">
            <p className="text-xs text-muted-foreground">
              時系列のメモです。「次の一手」は{" "}
              <span className="font-medium text-foreground">「タスク詳細」欄</span>{" "}
              にだけ書きます。
            </p>
            <Separator />
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <SectionLabel id="notes-heading">メモ一覧</SectionLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="gap-1"
                  onClick={() => {
                    const today = new Date().toISOString().slice(0, 10);
                    onUpdateNotes([...task!.notes, `${today} `]);
                  }}
                >
                  <Plus className="size-3.5" aria-hidden />
                  行を追加
                </Button>
              </div>
              <ul className="flex flex-col gap-3">
                {task!.notes.length === 0 ? (
                  <li className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                    まだメモがありません。「行を追加」から書き始められます。
                  </li>
                ) : (
                  task!.notes.map((text, index) => (
                    <li key={`${task!.id}-note-${index}`} className="flex items-start gap-1.5">
                      <InlineTextareaField
                        ariaLabel={`備考 ${index + 1}`}
                        value={text}
                        onSave={(v) => {
                          const next = [...task!.notes];
                          next[index] = v;
                          onUpdateNotes(next);
                        }}
                        placeholder="メモ（古い順・下に追記すると読みやすいです）"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="mt-1.5 shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label={`備考 ${index + 1} を削除`}
                        onClick={() => {
                          const next = task!.notes.filter((_, i) => i !== index);
                          onUpdateNotes(next);
                        }}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </Button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </ScrollArea>
      )}
    </aside>
  );
}
