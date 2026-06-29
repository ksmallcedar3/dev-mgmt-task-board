"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type AddTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSubCategory?: string;
  subCategoryOptions: string[];
  onAdd: (title: string, subCategory?: string) => void;
};

export function AddTaskDialog({
  open,
  onOpenChange,
  defaultSubCategory,
  subCategoryOptions,
  onAdd,
}: AddTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [subCategory, setSubCategory] = useState(defaultSubCategory ?? "");

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    onAdd(trimmedTitle, subCategory.trim() || undefined);
    setTitle("");
    setSubCategory(defaultSubCategory ?? "");
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setTitle("");
          setSubCategory(defaultSubCategory ?? "");
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>タスクを追加</DialogTitle>
          <DialogDescription>新しいタスクを追加します（ステータスは「未着手」になります）</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="add-task-subcategory">中項目</FieldLabel>
            <Input
              id="add-task-subcategory"
              list="subcategory-options"
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              placeholder="例: 資格取得支援制度（任意）"
            />
            {subCategoryOptions.length > 0 && (
              <datalist id="subcategory-options">
                {subCategoryOptions.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="add-task-title">タスク名</FieldLabel>
            <Input
              id="add-task-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              placeholder="例: 人財企画課からの問合せ対応"
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">キャンセル</Button>} />
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            追加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
