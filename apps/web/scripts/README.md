# 管理者設定スクリプト

## 管理者ユーザーの設定方法

### 方法1: 環境変数を使用（推奨）

1. `.env.local` ファイルに以下を追加:
   ```
   DEFAULT_ADMIN_DISCORD_IDS=あなたのDiscordID
   ```

2. 初回ログイン時に自動的に管理者として登録されます

### 方法2: Firebase Emulator UI を使用（開発環境）

1. Firebase Emulatorを起動:
   ```bash
   pnpm firebase:emulators
   ```

2. http://localhost:4000 でEmulator UIを開く

3. Firestore > users コレクションから該当ユーザーを見つける

4. `role` フィールドを `"member"` から `"admin"` に変更

5. 保存して再ログイン

### 方法3: setup-adminスクリプトを使用（本番環境）

1. 必要な環境変数を設定:
   ```
   GOOGLE_CLOUD_PROJECT=suzumina-click
   ```

2. スクリプトを実行:
   ```bash
   pnpm tsx scripts/setup-admin.ts <Discord ID>
   ```

## Discord IDの確認方法

1. Discordの設定で「開発者モード」を有効化
2. 自分のプロフィールを右クリック
3. 「IDをコピー」を選択

## トラブルシューティング

- **ユーザーが見つからない**: 先にサイトにログインしてユーザーを作成してください
- **権限エラー**: Google Cloud認証情報が正しく設定されているか確認してください
- **再ログインが必要**: ロール変更後は一度ログアウトして再ログインしてください