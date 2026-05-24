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
import { Plus } from "lucide-react";

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
  if (!task) {
    return (
      <aside
        className="flex w-[320px] shrink-0 flex-col border-l border-border bg-background"
        aria-label="備考"
      >
        <header className="flex h-12 shrink-0 items-center justify-end gap-2 border-b border-border px-2">
          <Pane4Toggle open={false} onToggle={() => {}} disabled />
        </header>
        <div className="flex min-h-0 flex-1 items-center justify-center px-4">
          <p className="text-center text-xs text-muted-foreground">
            タスクを選ぶと備考を編集できます。
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="flex w-[320px] shrink-0 flex-col border-l border-border bg-background"
      aria-label="備考"
    >
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          備考
        </h2>
        <Pane4Toggle open={pane4Open} onToggle={onTogglePane4} />
      </header>

      {pane4Open ? (
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-4 p-4">
            <p className="text-xs text-muted-foreground">
              時系列のメモです。「次の一手」は{" "}
              <span className="font-medium text-foreground">Pane 3</span>{" "}
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
                  onClick={() => onUpdateNotes([...task.notes, ""])}
                >
                  <Plus className="size-3.5" aria-hidden />
                  行を追加
                </Button>
              </div>
              <ul className="flex flex-col gap-3">
                {task.notes.length === 0 ? (
                  <li className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                    まだメモがありません。「行を追加」から書き始められます。
                  </li>
                ) : (
                  task.notes.map((text, index) => (
                    <li key={`${task.id}-note-${index}`}>
                      <InlineTextareaField
                        ariaLabel={`備考 ${index + 1}`}
                        value={text}
                        onSave={(v) => {
                          const next = [...task.notes];
                          next[index] = v;
                          onUpdateNotes(next);
                        }}
                        placeholder="メモ（古い順・下に追記すると読みやすいです）"
                      />
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </ScrollArea>
      ) : (
        <div className="flex min-h-0 flex-1 items-start justify-center px-4 pt-6">
          <p className="text-center text-xs text-muted-foreground">
            右の矢印で備考パネルを展開してください。
          </p>
        </div>
      )}
    </aside>
  );
}
