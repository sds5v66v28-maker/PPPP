# FamiTask - ファミリー向けタスク＆カレンダー共有アプリ

家族みんなで予定・タスクを共有できるアプリです。カレンダービュー、タスク管理、リアルタイム同期に対応しています。

## 機能

- **認証** — メール/パスワード + Google OAuth（Supabase Auth）
- **ファミリーグループ** — グループ作成・招待リンクによるメンバー追加
- **カレンダー** — 月/週/日ビュー切り替え、予定とタスクを色分け表示
- **タスク管理** — 優先度・期限・担当者・繰り返し設定
- **コメント＆リアクション** — 予定・タスクにコメント追加、👍などの絵文字リアクション
- **リアルタイム同期** — Supabase Realtimeで全員の画面を即時更新
- **ダークモード** — OS設定連動 + 手動切り替え
- **レスポンシブ** — スマホ（ボトムナビ）/ PC（サイドバー）対応

## セットアップ手順

### 1. Supabaseプロジェクトの設定

1. [Supabase](https://supabase.com) にアクセスしてプロジェクトを作成（または既存のものを使用）
2. **SQL Editor** を開き、`supabase/migrations/001_initial.sql` の内容を貼り付けて実行
3. **Project Settings → API** から以下をコピー：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon (public)` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Google OAuth の設定（任意）

1. Supabase ダッシュボード → **Authentication → Providers → Google** を有効化
2. Google Cloud Console でOAuthクライアントIDを作成
3. 承認済みリダイレクトURIに `https://<your-supabase-project>.supabase.co/auth/v1/callback` を追加
4. クライアントID/シークレットをSupabaseに設定

### 3. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を編集して実際の値を設定：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. 依存パッケージのインストール

```bash
npm install
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

---

## Vercelへのデプロイ

1. GitHubにリポジトリをプッシュ
2. [Vercel](https://vercel.com) でプロジェクトをインポート
3. **Environment Variables** に以下を追加：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. デプロイ後、Supabase → **Authentication → URL Configuration** の `Site URL` とリダイレクトURLをVercelのURLに更新

---

## DBスキーマ（概要）

| テーブル | 説明 |
|---|---|
| `profiles` | ユーザープロフィール（auth.usersに連動） |
| `family_groups` | ファミリーグループ |
| `family_members` | グループメンバーシップ |
| `events` | カレンダー予定 |
| `tasks` | タスク（繰り返し対応） |
| `comments` | 予定・タスクへのコメント |
| `reactions` | 絵文字リアクション |

全テーブルにRow Level Security（RLS）が有効で、グループメンバーのみがデータにアクセスできます。

## 技術スタック

- **フロントエンド**: Next.js 16 (App Router) + TypeScript
- **スタイリング**: Tailwind CSS v4
- **バックエンド/DB**: Supabase（PostgreSQL + Realtime + Auth）
- **デプロイ**: Vercel
