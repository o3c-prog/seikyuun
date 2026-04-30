# 請求書管理アプリ 設計書

## 技術スタック

| レイヤー | 採用技術 | 理由 |
|---------|---------|------|
| フレームワーク | Next.js 15 (App Router) | フルスタック・デプロイ容易 |
| UI | shadcn/ui + Tailwind CSS | 高品質コンポーネント・カスタマイズ容易 |
| DB | Supabase (PostgreSQL) | 認証・リアルタイム・Storage 込み |
| ORM | Prisma | 型安全・マイグレーション管理 |
| 認証 | Supabase Auth | Google OAuth 対応 |
| PDF生成 | @react-pdf/renderer | サーバーサイドPDF |
| ドラッグ | @dnd-kit/core | 明細行の並び替え |
| フォーム | React Hook Form + Zod | バリデーション |
| メール | Resend | トランザクションメール |
| デプロイ | Vercel | Next.js 最適化 |

---

## データモデル

### clients（顧客）
```sql
id              uuid PK
user_id         uuid FK → auth.users
name            text NOT NULL          -- 書類表示用正式名称
short_name      text NOT NULL          -- 画面表示用略称
honorific       text DEFAULT '御中'    -- 敬称
postal_code     text
address         text
tel             text
fax             text
email           text                   -- 送付先メール
contact_name    text                   -- 担当者名
contact_dept    text                   -- 部署名
payment_terms   text                   -- 支払条件
bank_account_id uuid FK → bank_accounts
send_method     text DEFAULT 'email'   -- email / post
invoice_number  text                   -- インボイス登録番号
notes           text
is_archived     boolean DEFAULT false
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

### projects（案件）
```sql
id                uuid PK
user_id           uuid FK → auth.users
client_id         uuid FK → clients
name              text NOT NULL
contact_name      text                 -- 担当者（スナップショット）
order_status      text DEFAULT 'estimate_mid'
  -- estimate_high / estimate_mid / estimate_low / confirmed / ordered / lost
invoice_timing    text DEFAULT 'single'  -- single / split
invoice_date      date                 -- 請求予定日
payment_due_date  date
payment_terms     text
bank_account_id   uuid FK → bank_accounts
category_tag      text
internal_memo     text
created_at        timestamptz DEFAULT now()
updated_at        timestamptz DEFAULT now()
```

### documents（書類）
```sql
id              uuid PK
project_id      uuid FK → projects
user_id         uuid FK → auth.users
doc_type        text NOT NULL          -- estimate / invoice / receipt
doc_number      text NOT NULL          -- 自動採番
issued_at       date NOT NULL
due_date        date
subject         text
notes           text                   -- 顧客向け備考（書類PDFに出力）
internal_memo   text                   -- 社内メモ（書類PDFには出力しない）
client_snapshot jsonb NOT NULL         -- 作成時の顧客情報スナップショット
subtotal        integer DEFAULT 0
tax_amount      integer DEFAULT 0
total_amount    integer DEFAULT 0
withholding_tax integer DEFAULT 0
invoice_status  text DEFAULT 'draft'   -- draft / issued / sent / paid
issued_status_at timestamptz           -- 発行ボタンを押した日時
sent_at         timestamptz
paid_at         date
invoice_eligible boolean DEFAULT true  -- 適格請求書フラグ
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

### document_items（明細行）
```sql
id          uuid PK
document_id uuid FK → documents ON DELETE CASCADE
row_type    text DEFAULT 'normal'      -- normal / heading / subtotal
name        text NOT NULL              -- 摘要 / 見出しテキスト / "小計"等
quantity    numeric DEFAULT 1          -- normal以外は使用しない
unit_price  integer                    -- normal以外はNULL
tax_rate    integer DEFAULT 10         -- 10 / 8 / 0、normal以外はNULL
amount      integer                    -- normal=quantity×unit_price、subtotal=自動算出（保存時再計算）、heading=NULL
notes       text
sort_order  integer NOT NULL
```

**行タイプの集計ルール**
- `subtotal` の `amount` は、直前の `heading`（または書類冒頭）から自身までの `normal` 行の `amount` を合算した値。書類保存時に再計算してDBに反映する
- グループ概念は別テーブルを持たず、`heading → normal × N → subtotal` の sort_order シーケンスで表現する

### bank_accounts（振込口座）
```sql
id           uuid PK
user_id      uuid FK → auth.users
bank_name    text NOT NULL
branch_name  text
account_type text                      -- 普通 / 当座
account_number text
account_name text
is_default   boolean DEFAULT false
```

---

## 画面構成（ページ一覧）

```
/                       → ダッシュボード（未請求件数・直近案件）
/clients                → 顧客一覧
/clients/new            → 顧客登録
/clients/[id]/edit      → 顧客編集
/projects               → 案件一覧
/projects/new           → 案件登録
/projects/[id]/edit     → 案件編集
/projects/[id]/documents → 書類一覧（見積・請求・領収）
/documents/[id]         → 書類編集
/documents/[id]/preview → PDF プレビュー
/invoices               → 請求一覧（ステータス管理）
/settings               → 自社情報・振込口座・メールテンプレート
```

---

## 画面仕様

### 案件一覧（/projects）

**カラム構成**
| No | 案件名 | 顧客 | 見積額 | 請求額 | 受注 | 進捗 | 請求日 | アクション |

**行背景色**
- 見積中（高）: `bg-red-50`
- 受注確定: `bg-yellow-50`
- 受注済: `bg-green-50`
- 失注: `bg-gray-100 opacity-60`

**行末アクション**
- 「書類」ボタン → `/projects/[id]/documents`
- 「編集」ボタン → `/projects/[id]/edit`

**フィルター**
- 受注ステータス（セレクト）
- 顧客（セレクト）
- テキスト検索（案件名）

---

### 書類編集（/documents/[id]）

**ページヘッダー**
```
[見積管理 > 見積作成]                  [プレビュー] [下書き保存] [見積書を発行 ▼]
見積作成  [下書き]
```
- パンくず：書類タイプに応じて `見積管理 / 請求管理 / 納品管理` を起点
- 右側アクション：
  - `プレビュー` — PDF プレビューモーダル
  - `下書き保存` — `invoice_status = draft` のまま保存
  - `[書類タイプ]を発行 ▼` — `invoice_status = issued` に変更（プライマリ・紫グラデ）。ドロップダウンから「発行してメール送付」も選択可
- タイトル横にステータスバッジ：`下書き / 発行済 / 送付済 / 入金済`

**メインレイアウト（2カラム）**
```
┌──── 基本情報パネル（左 1/3）─────┐ ┌──────── 見積内容パネル（右 2/3）────────────┐
│ 顧客*       [株式会社サンプル ▾]  │ │ 見積内容                [+行を追加][⎘行を複製]│
│ 〒xxx 住所 / 担当 / TEL / Mail   │ │ ┌─────────────────────────────────────────┐│
│ 案件        [Webサイト ▾][+新規]  │ │ │No│品目・サービス内容 │数量│単価   │金額 │⋮││
│ 見積番号*  [QT-2025-00023]      │ │ │1 │要件定義          │1  │150,000│150,000│⋮││
│ 見積日*[__] 有効期限 [__]         │ │ │2 │デザイン制作      │1  │300,000│300,000│⋮││
│ 件名*      [Webサイトリニューアル] │ │ │  │（小計行・見出し行は別スタイル）        ││
│ 社内メモ  [____________________]  │ │ └─────────────────────────────────────────┘│
│ テンプレート [シンプル(左ロゴ) ▾]  │ │           小計          ¥1,100,000           │
│                                  │ │           消費税(10%)      ¥110,000          │
│                                  │ │           合計（税込）   ¥1,210,000          │
│                                  │ │ ┌── 顧客向け備考 ─────────────────────────┐│
│                                  │ │ │ お支払い条件：月末締め翌月末払い         ││
│                                  │ │ │ 本見積の有効期限内にご発注をお願いします。││
│                                  │ │ └─────────────────────────────────────────┘│
└──────────────────────────────────┘ └──────────────────────────────────────────────┘
```

**行タイプ別の表示**
- `通常`：先頭にオレンジグラデの番号バッジ。摘要・数量・単価・税率・金額のすべてのカラムを表示
- `見出し行`：番号バッジなし。摘要セルのみ太字でフル幅。背景はわずかに濃いトーン
- `小計行`：番号バッジなし。摘要は固定 `小計`、金額のみ自動算出。罫線で他行と区切る

**行操作**（`⋮` メニューに集約）
- 並び替え（ドラッグハンドル）
- この行の直下に行を追加
- この行を複製
- 行タイプを変更（通常 / 見出し / 小計）
- 削除

テーブル上部の `+ 行を追加` `⎘ 行を複製` ボタンは末尾追加・選択行複製のショートカット。

---

## 自動採番ルール

```
見積書: EST-YYYYMM-001, EST-YYYYMM-002, ...
請求書: INV-YYYYMM-001, INV-YYYYMM-002, ...
領収書: RCP-YYYYMM-001, RCP-YYYYMM-002, ...
```

---

## デザインシステム

プロダクト名：**見積クラウド**（仮）。柔らかく親しみやすい雰囲気。装飾は控えめのパステルと植物モチーフ。

### カラートークン

| 用途 | トークン | 値（Tailwind想定） |
|---|---|---|
| プライマリ（発行ボタン・ロゴ・アクティブ強調） | `primary` | violet-500 → indigo-500 グラデーション |
| プライマリ（hover/pressed） | `primary-strong` | violet-600 → indigo-600 |
| サイドバー アクティブ背景 | `nav-active` | emerald-100 / teal-100 |
| サイドバー アクティブバー | `nav-bar` | teal-400 |
| 行番号バッジ | `accent` | amber-400 → orange-400 グラデーション |
| カード背景 | `surface` | white |
| ページ背景 | `background` | slate-50 / 装飾用パステル散りばめ |
| ボーダー | `border` | slate-200 |
| テキスト primary | `fg` | slate-900 |
| テキスト muted | `fg-muted` | slate-500 |
| ステータス: 下書き | `status-draft` | slate-100 / slate-600 |
| ステータス: 発行済 | `status-issued` | violet-100 / violet-700 |
| ステータス: 送付済 | `status-sent` | sky-100 / sky-700 |
| ステータス: 入金済 | `status-paid` | emerald-100 / emerald-700 |

### コンポーネント標準

| 項目 | 値 |
|---|---|
| 角丸 | カード `rounded-2xl`（16px）、ボタン・入力 `rounded-lg`（10px） |
| 影 | カード `shadow-sm`、モーダル `shadow-xl` |
| 余白 | カード内 `p-6`、フィールド間 `space-y-4` |
| アイコン | lucide-react 24px、行アクション 16px |
| 必須マーク | 赤アスタリスク `text-red-500` |
| 入力フィールド | カレンダー等のリーディングアイコン対応 |
| 装飾 | ページ四隅にパステル幾何 / 植物 SVG（控えめに） |

### サイドバー

```
[ロゴ] 見積クラウド
─────────────
👥 顧客管理
💼 案件管理       ← active（emerald背景＋teal縦バー）
📄 見積管理       ← sub active
📄 請求管理
📄 納品管理
```

---

## APIルート（Next.js Route Handlers）

```
GET    /api/clients
POST   /api/clients
PUT    /api/clients/[id]
DELETE /api/clients/[id]  → アーカイブに変更

GET    /api/projects
POST   /api/projects
PUT    /api/projects/[id]

GET    /api/documents/[id]
POST   /api/documents              → 書類作成（顧客スナップショット保存・status=draft）
PUT    /api/documents/[id]         → 下書き保存
POST   /api/documents/[id]/issue   → ステータス「発行済」に変更（issued_status_at記録）
POST   /api/documents/[id]/send    → ステータス「送付済」に変更・メール送信
POST   /api/documents/[id]/paid    → ステータス「入金済」に変更

GET    /api/documents/[id]/pdf     → PDF生成
```

---

## ディレクトリ構成

```
invoice-app/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── page.tsx              # ダッシュボード
│   │   ├── clients/
│   │   ├── projects/
│   │   ├── documents/
│   │   ├── invoices/
│   │   └── settings/
│   └── api/
│       ├── clients/
│       ├── projects/
│       └── documents/
├── components/
│   ├── ui/                       # shadcn/ui
│   ├── layout/                   # Sidebar, Header
│   ├── clients/                  # ClientForm, ClientList
│   ├── projects/                 # ProjectForm, ProjectList
│   ├── documents/                # DocumentEditor, ItemGroup, ItemRow
│   └── pdf/                      # InvoicePDF template
├── lib/
│   ├── supabase/
│   ├── prisma/
│   └── utils/
├── prisma/
│   └── schema.prisma
└── docs/
    ├── requirements.md
    └── design.md
```
