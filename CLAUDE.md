# Invoice App — Claude Code 指示書

## プロダクト概要

広告・Web制作業向けのクラウド請求書管理アプリ。
board の業務設計（案件中心・顧客スナップショット・ステータス自動遷移）と
Misoca のシンプルな UX（カード型リスト・ワンクリック送付）を参考に構築。

詳細は `docs/requirements.md` と `docs/design.md` を参照。

---

## 技術スタック

- **Framework**: Next.js 15 (App Router, TypeScript)
- **UI**: shadcn/ui + Tailwind CSS
- **DB**: Supabase (PostgreSQL) + Prisma ORM
- **認証**: Supabase Auth (Google OAuth)
- **PDF**: @react-pdf/renderer
- **ドラッグ**: @dnd-kit/core
- **フォーム**: React Hook Form + Zod
- **メール**: Resend
- **デプロイ**: Vercel

---

## 開発方針

### ミニマム優先
- 機能はMVPスコープに絞る（docs/requirements.md 参照）
- 過度な抽象化・早期最適化をしない
- コンポーネントは小さく、単一責任で作る

### コーディング規約
- TypeScript strict モード
- `any` 型の使用禁止
- Server Components を優先、必要な箇所のみ `'use client'`
- データ取得は Server Actions または Route Handlers
- エラーハンドリングを必ず実装

### 命名規則
- ファイル: kebab-case (`project-list.tsx`)
- コンポーネント: PascalCase (`ProjectList`)
- 関数: camelCase (`getProjects`)
- 定数: UPPER_SNAKE_CASE

---

## 重要な設計ルール

### 1. 顧客情報のスナップショット保持
書類（Document）作成時に `client_snapshot` カラムに顧客情報を JSON で保存する。
顧客マスタを更新しても過去の書類に影響しない。

```typescript
// 書類作成時
const clientSnapshot = {
  name: client.name,
  address: client.address,
  // ...
}
await prisma.document.create({
  data: { client_snapshot: clientSnapshot, ... }
})
```

### 2. 金額計算は整数（円）で管理
- DB カラムは `integer`（円単位）
- 消費税の端数は切り捨て
- フロントでは `toLocaleString('ja-JP')` で表示

### 3. 請求ステータスの自動遷移
メール送付 API 実行時に `invoice_status` を `sent` に自動変更する。

```typescript
// /api/documents/[id]/send
await prisma.document.update({
  where: { id },
  data: { invoice_status: 'sent', sent_at: new Date() }
})
```

### 4. 明細グループの構造
グループあり・なしを混在可能にする。
- `group_id = null` の明細行はグループなし（フラット）
- グループがある場合はグループ小計を自動計算して表示

---

## セットアップ手順

```bash
# 1. 依存関係インストール
npm install

# 2. 環境変数設定（.env.local）
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
RESEND_API_KEY=

# 3. DB マイグレーション
npx prisma migrate dev

# 4. 開発サーバー起動
npm run dev
```

---

## 実装順序（推奨）

1. プロジェクト初期化・依存関係インストール
2. Supabase 接続・認証（ログイン画面）
3. Prisma スキーマ定義・マイグレーション
4. レイアウト（サイドバー・ヘッダー）
5. 顧客管理（CRUD）
6. 案件管理（CRUD）
7. 書類編集（明細グループ・計算）
8. PDF生成
9. メール送付
10. ダッシュボード（未請求アラート）
