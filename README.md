# dev-mgmt-task-board

開発管理課向けのタスク状況管理UI（4ペイン・Next.js + shadcn/ui）。  
誰が・何を・いつまでを見える化し、担当未割当の抜けを減らすためのモック。

## 画面構成

| Pane | 役割 |
|------|------|
| **Pane 1** | テーマ（人財育成・品質向上 など）を選ぶ |
| **Pane 2** | 選んだテーマ内のタスク一覧（ステータス別） |
| **Pane 3** | 状況と次の一手（公式） |
| **Pane 4** | 備考のみ（時系列メモ） |

## 技術スタック

- **Next.js 16** / **React 19** / **TypeScript**
- **Tailwind CSS v4** / **shadcn/ui**
- データ: JSON モック（`data/tasks.json`）

## 起動方法

```bash
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開く。

## フェーズ

- **Phase 1（現在）**: 課長個人での整理・型作り
- **Phase 2（予定）**: 課内チームでの共有

## 元雛形

AI-Driven School `workspace-ui-kit`
