# dev-mgmt-task-board

開発管理課向け **4ペイン Next.js 16 × shadcn/ui タスク状況管理UI**。

---

## プロジェクト概要

課長視点で「誰が・何を・いつまで」を見える化し、担当未割当の抜けを減らすためのモック。

| Pane | 役割 |
|------|------|
| Pane 1 | テーマ（人財育成・品質向上 など）の選択 |
| Pane 2 | ステータス別タスク一覧（担当・未割当バッジ） |
| Pane 3 | 状況 ＋ 次の一手（公式）|
| Pane 4 | 備考のみ（時系列メモ。次の一手は書かない） |

詳細: [docs/grill-product-brief.md](docs/grill-product-brief.md)

---

## 同梱スキル

| スキル | いつ発動するか | パス |
|--------|---------------|------|
| designing-workspace-ui | ペイン変更・色変更・コンポーネント追加など UI 作業 | [SKILL.md](.claude/skills/designing-workspace-ui/SKILL.md) |
| shadcn | shadcn 部品の追加・カスタマイズ | [SKILL.md](.claude/skills/shadcn/SKILL.md) |
| next-best-practices | Next.js 16 のファイル規約・RSC 境界・async パターン等 | [SKILL.md](.claude/skills/next-best-practices/SKILL.md) |
| vercel-react-best-practices | React 性能最適化（70 ルール / 8 カテゴリ） | [SKILL.md](.claude/skills/vercel-react-best-practices/SKILL.md) |

MUST: Next.js のコードを書く前に `node_modules/next/dist/docs/` の該当ドキュメントを読む。学習データではなくバンドル版が正。

---

## 視覚 SSoT

画面の SSoT（Single Source of Truth = 情報の正本）は `components/workspace/Workspace.tsx`。

- データ: `data/tasks.json`（JSON モック）
- 型定義: `lib/schema.ts`
- ラベル: `lib/labels.ts`

---

## 編集の方針

IMPORTANT: 以下を守ること。

- **UI 変更を始める前に `designing-workspace-ui` スキルを起動する**。トークン・部品・レイアウトで足りないときは決定木 3a〜3d でユーザー確認し、独断で SSoT を広げない
- **フィールド編集は `components/primitives/Inline*`（shadcn 標準フォーム、border-input + bg-card）を再利用**。鉛筆 / 「編集」ボタン / 編集専用モーダルに逃がさない
- **shadcn 部品の更新は `npx shadcn@latest add ... --diff` で確認**。`--overwrite` は本人の明示許可なしに使わない（独自 variant が消えるため）
- **Pane4 に「次の一手」を追加しない**（グリルで Pane3 公式に決定済み）
- **カテゴリ（Pane1）をメンバー名にしない**（テーマ＝仕事の束、担当＝行）

---

## コード生成ルール

`components/` 配下を編集する際は必ず守る。詳細は [coding-rules.md](.claude/skills/designing-workspace-ui/references/coding-rules.md):

- 子要素の間隔は親で管理（`flex flex-col gap-*` を使う、`space-y-*` は使わない）
- 部品の見た目を呼び出し側で打ち消さない（色・フォントサイズの `className` 上書き禁止。部品側に variant を追加する）
- 色は役割で名前付けされたトークンを使う（`bg-primary` 等。`bg-blue-500` のような色番号は使わない）
- 正方形の要素には `size-N` を使う（`w-N h-N` ではなく）
- このプロジェクトは shadcn の **base**（Base UI）を使用。カスタムトリガーには `asChild` ではなく `render` を使う
- shadcn の部品（Button / Card / Badge 等）が使えるなら、自前の div で代替しない
- 派生 state を Effect で複製しない（レンダーで計算する）

---

## 技術スタック

- Next.js 16 / React 19 / TypeScript（strict）
- Tailwind CSS v4（`app/globals.css` の `@theme` で CSS 変数を一元管理）
- shadcn/ui（base-nova / `@base-ui/react`）
- lucide-react（アイコン）/ zod（ランタイム検証）
- データ: JSON モック（`data/tasks.json`）

---

## コマンド

```bash
npm run dev          # 開発サーバー起動
npm run build        # 本番ビルド
npm run lint         # ESLint
npm run test         # Vitest スモークテスト
npm run format       # Prettier
npm run check:radius # 角丸ドリフト検出
```

---

## やらないこと（現フェーズ）

- DB 接続・API・認証（Phase 2 以降）
- 同時編集・権限管理
- 親子タスク・負荷の自動計算
- `react-beautiful-dnd`（廃止ライブラリ）への置き換え
