"use client";

/**
 * 課員ビュー用 Pane 1。
 * 課員一覧を表示し、クリックでその人のタスクを Pane 2 に表示する。
 */

import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Member } from "@/lib/schema";
import { SidebarContent, SidebarHeader, Sidebar } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";

type MemberPaneProps = {
  members: Member[];
  /** 課員ごとの進行中タスク件数 */
  taskCounts: Record<string, number>;
  /** 課員ごとの期日警告タスク件数 */
  alertCounts: Record<string, number>;
  selectedMemberId: string;
  onSelectMember: (memberId: string) => void;
};

export function MemberPane({
  members,
  taskCounts,
  alertCounts,
  selectedMemberId,
  onSelectMember,
}: MemberPaneProps) {
  const internalMembers = members.filter((m) => m.type !== "external");
  const externalMembers = members.filter((m) => m.type === "external");

  const MemberButton = ({ member }: { member: Member }) => {
    const isSelected = member.id === selectedMemberId;
    const count = taskCounts[member.id] ?? 0;
    const alert = alertCounts[member.id] ?? 0;

    return (
      <button
        type="button"
        onClick={() => onSelectMember(member.id)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          isSelected
            ? "bg-accent text-accent-foreground font-medium"
            : "text-foreground hover:bg-muted",
        )}
      >
        {/* アバター（名前の頭文字） */}
        <span className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
          member.type === "external"
            ? "bg-muted text-muted-foreground"
            : member.type === "leader"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground",
        )}>
          {member.name[0]}
        </span>

        {/* 名前と役職 */}
        <div className="min-w-0 flex-1">
          <p className="truncate leading-tight">{member.name}</p>
          <p className="truncate text-xs text-muted-foreground">{member.role}</p>
        </div>

        {/* タスク件数・警告バッジ */}
        <div className="flex shrink-0 items-center gap-1">
          {alert > 0 && (
            <span className="rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
              {alert}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{count}</span>
        </div>
      </button>
    );
  };

  return (
    <Sidebar collapsible="none" className="w-52 border-r border-border">
      <SidebarHeader className="border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <UserRound className="size-4 text-muted-foreground" />
          課員一覧
        </div>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-0.5 p-2">
            {internalMembers.map((m) => (
              <MemberButton key={m.id} member={m} />
            ))}

            {externalMembers.length > 0 && (
              <>
                <p className="mt-2 px-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  課外協力者
                </p>
                {externalMembers.map((m) => (
                  <MemberButton key={m.id} member={m} />
                ))}
              </>
            )}
          </div>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}
