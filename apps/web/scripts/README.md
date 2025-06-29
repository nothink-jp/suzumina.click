# 管理者権限設定ガイド

## 📋 概要

suzumina.click v0.2.3+ では、管理者権限は **Firestore ベース** で管理されます。
環境変数（DEFAULT_ADMIN_DISCORD_IDS）は完全に廃止され、すべての管理者権限はFirestoreのuser documentで管理されます。

## 🛡️ 管理者アプリケーション

- **専用URL**: admin.suzumina.click
- **アクセス方式**: 独立したNext.js アプリケーション
- **認証方式**: Firestore ロールベース認証
- **インスタンス**: 0インスタンス運用（アクセス時のみ起動）

## 🔧 管理者権限の設定方法

### 方法1: Firestore Console（推奨）

1. **Google Cloud Console**でFirestoreにアクセス
2. `users` コレクションを開く
3. 該当ユーザーのドキュメントを検索（Discord IDで検索）
4. 以下のフィールドを編集:
   ```json
   {
     "role": "admin",
     "isActive": true
   }
   ```
5. 保存後、再ログインで管理者権限が有効化

### 方法2: Firebase Emulator UI（開発環境）

1. **開発環境でEmulatorを起動**:
   ```bash
   pnpm firebase:emulators
   ```

2. **http://localhost:4000** でEmulator UIを開く

3. **Firestore > users** コレクションから該当ユーザーを検索

4. **ユーザーdocumentを編集**:
   - `role`: `"member"` → `"admin"`
   - `isActive`: `true` に設定

5. **保存してブラウザリロード**

### 方法3: gcloud CLI（本番環境）

```bash
# Firestore user documentを直接更新
gcloud firestore documents update users/[DISCORD_ID] \
  --update-mask="role,isActive" \
  --data='{"role":"admin","isActive":true}'
```

## 📱 管理者アプリアクセス手順

1. **admin.suzumina.click** にアクセス
2. **「Discord でログイン」**をクリック
3. **Discord OAuth認証**を完了
4. **Firestore認証チェック**:
   - `role === "admin"`
   - `isActive === true`
5. **認証成功**で管理者ダッシュボードが表示

## 🔍 Discord IDの確認方法

1. **Discordの設定**で「開発者モード」を有効化
2. **自分のプロフィール**を右クリック
3. **「IDをコピー」**を選択
4. **長い数字列**（例: `570920263135264778`）が Discord ID

## 🚨 トラブルシューティング

### ❌ ログインできない

**確認ポイント**:
- ユーザーが `users` コレクションに存在するか
- `role` が `"admin"` になっているか
- `isActive` が `true` になっているか
- Discord ギルドメンバーシップが有効か

**解決方法**:
```bash
# 1. ユーザー存在確認
gcloud firestore documents describe users/[DISCORD_ID]

# 2. 権限確認・修正
gcloud firestore documents update users/[DISCORD_ID] \
  --update-mask="role,isActive" \
  --data='{"role":"admin","isActive":true}'
```

### ❌ "管理者が見つかりません"エラー

**原因**: 初回ログイン前にFirestoreにユーザーが作成されていない

**解決方法**:
1. **suzumina.click** (メインサイト) に一度ログイン
2. **ユーザー作成後**、上記の方法で管理者権限を付与
3. **admin.suzumina.click** に再アクセス

### ❌ セッションエラー

**解決方法**:
- **ブラウザのCookieをクリア**
- **シークレット/プライベートブラウジング**でテスト
- **一度ログアウト**してから再ログイン

## 🔄 従来との差分

| 項目 | v0.2.2以前 | v0.2.3以降 |
|------|------------|------------|
| **認証方式** | 環境変数 DEFAULT_ADMIN_DISCORD_IDS | Firestore role ベース |
| **管理者ページ** | /admin (Web app 内) | admin.suzumina.click (独立アプリ) |
| **設定方法** | 環境変数設定 + デプロイ | Firestore document編集 |
| **新規ユーザー** | 環境変数で管理者自動設定 | 全員 "member" 開始 |
| **運用コスト** | 常時稼働 | 0インスタンス（必要時のみ） |

## ⚠️ 重要な注意事項

1. **環境変数は完全廃止**: DEFAULT_ADMIN_DISCORD_IDS は使用されません
2. **新規ユーザーは member**: すべての新規ユーザーは "member" ロールで開始
3. **手動権限付与が必要**: 管理者権限はFirestore で手動設定が必要
4. **再デプロイ不要**: 管理者権限変更にデプロイは不要