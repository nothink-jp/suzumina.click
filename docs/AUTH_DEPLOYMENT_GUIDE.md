# Discord認証機能デプロイメントガイド

## 🔧 事前準備

### 1. Discord OAuth Application作成

1. [Discord Developer Portal](https://discord.com/developers/applications) にアクセス
2. 「New Application」をクリックしてアプリケーション作成
3. OAuth2 > General から以下を取得:
   - **Client ID** (`discord_client_id`)
   - **Client Secret** (`discord_client_secret`)

### 2. Redirect URIs設定

OAuth2 > General > Redirects で以下を追加:

```
# 開発環境
http://localhost:3000/api/auth/callback/discord

# 本番環境
https://suzumina.click/api/auth/callback/discord
```

### 3. Discord Bot Token取得（オプション）

高度なGuild管理機能を使用する場合:

1. Discord Developer Portal > Bot
2. 「Reset Token」で新しいトークンを生成
3. 必要な権限を設定（Guild読み取り権限）

## 📝 terraform.tfvars設定

`terraform.tfvars.example`をコピーして`terraform.tfvars`を作成:

```bash
cp terraform.tfvars.example terraform.tfvars
```

### 必須設定項目

```hcl
# Discord OAuth設定
discord_client_id = "1357640432196255874"      # あなたのClient ID
discord_client_secret = "your-secret-here"     # あなたのClient Secret

# NextAuth Secret生成
nextauth_secret = "$(openssl rand -base64 32)"  # 自動生成推奨
```

### オプション設定項目

```hcl
# Discord Bot Token（Guild詳細管理用）
discord_bot_token = "MTxxxxx.xxxxx.xxxxxxxxxxxx"  # オプション

# Guild ID（通常は変更不要）
suzumina_guild_id = "959095494456537158"  # すずみなふぁみりー
```

## 🚀 デプロイメント手順

### 1. NextAuth Secret生成

```bash
# ランダムなシークレット生成
openssl rand -base64 32
```

このキーを`terraform.tfvars`の`nextauth_secret`に設定。

### 2. Terraform適用

```bash
cd terraform

# 変更内容確認
terraform plan

# 認証機能デプロイ
terraform apply
```

### 3. デプロイ確認

以下が正しく作成されることを確認:

1. **Secret Manager**:
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
   - `DISCORD_BOT_TOKEN` (設定した場合)
   - `NEXTAUTH_SECRET`

2. **Cloud Run環境変数**:
   - Secret Manager参照が正しく設定されている
   - `NEXTAUTH_URL`が本番ドメインに設定されている

3. **Firestore**:
   - `users`コレクション用インデックス
   - `audioButtons`コレクション用インデックス

## 🔒 セキュリティ考慮事項

### tfvarsファイル管理

```bash
# .gitignoreに追加（既に設定済み）
echo "terraform.tfvars" >> .gitignore

# 権限制限
chmod 600 terraform.tfvars
```

### シークレットローテーション

本番環境では定期的にシークレットをローテーション:

```bash
# NextAuth Secretの更新
NEW_SECRET=$(openssl rand -base64 32)
terraform apply -var="nextauth_secret=$NEW_SECRET"
```

## 🌐 環境別設定

### 開発環境 (staging)

```hcl
environment = "staging"
custom_domain = ""  # Cloud Run URLを使用
```

### 本番環境 (production)

```hcl
environment = "production"
custom_domain = "suzumina.click"
```

## 🔍 トラブルシューティング

### よくある問題

1. **Redirect URI Mismatch**
   - Discord Developer Portalの設定を確認
   - 本番ドメインが正しく設定されているか確認

2. **Secret Manager Access Error**
   - Cloud RunサービスアカウントのIAM権限を確認
   - Secret Managerでシークレットが作成されているか確認

3. **Guild認証エラー**
   - Guild ID (`959095494456537158`) が正しいか確認
   - ユーザーがGuildのメンバーかDiscordで確認

### デバッグ方法

```bash
# Cloud Runログ確認
gcloud logging read "resource.type=cloud_run_revision" --limit=50

# Secret Manager確認
gcloud secrets versions access latest --secret="DISCORD_CLIENT_ID"
```

## 📊 監視設定

認証関連のメトリクスを監視:

1. **認証成功率**
2. **Guild認証失敗率**
3. **Secret Manager APIエラー**

これらは既存のモニタリング設定で監視されます。

## ⚠️ 重要な注意事項

1. **terraform.tfvars** は絶対にGitにコミットしない
2. **本番シークレット** は定期的にローテーションする
3. **Guild ID** は変更しない（すずみなふぁみりー固定）
4. **Redirect URI** は本番デプロイ前にDiscordで設定する