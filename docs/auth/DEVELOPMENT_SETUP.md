# 開発環境セットアップ手順

## 1. Discord Developer Portal の設定

1. [Discord Developer Portal](https://discord.com/developers/applications) にアクセス
2. 「New Application」をクリック
3. アプリケーション名を入力（例：`suzumina-click-dev`）
4. 「OAuth2」設定:
   - Redirects: `http://localhost:3000/api/auth/callback/discord` を追加
   - Scopes: `identify`, `guilds` を有効化
5. クライアントID とクライアントシークレットを保存

## 2. データベースのセットアップ

### SQLiteデータベースの初期化

開発環境ではSQLiteデータベースを使用します。以下の手順でデータベースを初期化します。

```bash
# リポジトリルートで実行
cd apps/web

# マイグレーションの生成（スキーマに変更があった場合のみ）
bun run db:generate

# マイグレーションの実行
bun run db:migrate
```

これにより、`apps/web/dev.db`ファイルが作成され、必要なテーブルが初期化されます。

## 3. ローカル開発環境のセットアップ

```bash
# 依存関係のインストール (リポジトリルートで実行済みのはず)
# cd apps/web
# bun install

# 環境変数ファイルの作成
cd apps/web
cp .env.example .env.local
```

## 4. 環境変数の設定 (`.env.local`)

`apps/web/.env.local` に以下の環境変数を設定します。
**このファイルはローカル開発専用であり、Git にコミットしないでください。**

```env
# NextAuth設定
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# Discord OAuth設定
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_GUILD_ID=your-discord-guild-id

# データベース設定
DATABASE_URL=file:./dev.db
```

## 5. 開発サーバーの起動

```bash
# apps/web ディレクトリで実行
bun dev
```

サーバーが起動したら <http://localhost:3000> にアクセスできます。

## 6. 動作確認

1. トップページの認証ボタンをクリック
2. Discord認証画面が表示されることを確認
3. 認証後、ユーザーページにリダイレクトされることを確認

## トラブルシューティング

- **データベース関連:** マイグレーションが正常に実行されているか、`dev.db`ファイルが存在するか、`DATABASE_URL`が正しく設定されているかを確認してください。
- **Discord認証:** Discord Developer PortalのリダイレクトURL、`.env.local` のDiscord関連変数 (`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_GUILD_ID`)、`NEXTAUTH_URL`, `NEXTAUTH_SECRET` を確認してください。

## 補足：本番環境との違い

ローカル開発と本番環境では、以下の点が異なります：

1. **データベース**
   - 開発環境: SQLite (`file:./dev.db`)
   - 本番環境: PostgreSQL (Cloud SQL)

2. **環境変数管理**
   - 開発環境: `.env.local`ファイル
   - 本番環境: Secret Manager経由

3. **認証URL**
   - 開発環境: `http://localhost:3000`
   - 本番環境: `https://suzumina.click`

本番環境の設定は Terraform (`iac/`) で管理されます。詳細は関連ドキュメント (`docs/gcp/` 配下) を参照してください。

最終更新日: 2025年4月10日
