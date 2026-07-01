# dev-mgmt-task-board

開発管理課向けのタスク状況管理UI（4ペイン・Next.js + shadcn/ui）。  
誰が・何を・いつまでを見える化し、担当未割当の抜けを減らすためのモック。

## 画面構成

| Pane | 役割 |
|------|------|
| **Pane 1** | 年度目標（人財育成・品質向上 など）を選ぶ |
| **Pane 2** | 中項目グループ別タスク一覧。タスクの追加・選択 |
| **Pane 3** | 状況詳細と次の一手（公式） |
| **Pane 4** | 備考のみ（時系列メモ。次の一手は書かない） |

## 技術スタック

- **Next.js 16** / **React 19** / **TypeScript**（strict）
- **Tailwind CSS v4** / **shadcn/ui**（Base UI）
- **@dnd-kit** — ドラッグ＆ドロップ
- データ: PostgreSQL（`lib/db/tasks.ts`）

## 起動方法

```bash
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開く。

## ドキュメント

| ファイル | 内容 |
|---------|------|
| `docs/user-guide.md` | 操作手順書（Markdown） |
| `docs/user-guide.html` | 操作手順書（HTML・公開版） |
| `docs/grill-product-brief.md` | プロダクト仕様 |

操作手順書（公開）: https://dev-mgmt-user-guide.surge.sh

## フェーズ

- **Phase 1（現在）**: 課長個人での整理・型作り
- **Phase 2（予定）**: 課内チームでの共有

## 元雛形

AI-Driven School `workspace-ui-kit`
