# Cloud Run デプロイ手順

## 重要な注意事項

### 環境変数の確認

1. 現在のCloud Run URLを確認：

```bash
$ gcloud run services describe web \
    --region=asia-northeast1 \
    --format='value(status.url)'
https://web-d6fzgi5mga-an.a.run.app
```

2. NEXTAUTH_URLの設定を確認：

```bash
$ gcloud secrets versions access latest --secret=nextauth-url-dev
https://web-d6fzgi5mga-an.a.run.app
```

3. 環境変数の設定を確認：

```bash
$ gcloud run services describe web \
    --region=asia-northeast1 \
    --format='yaml(spec.template.spec.containers[0].env)'
spec:
  template:
    spec:
      containers:
      - env:
        - name: NODE_ENV
          value: production
        - name: NEXTAUTH_URL
          valueFrom:
            secretKeyRef:
              key: latest
              name: nextauth-url-dev
        - name: NEXTAUTH_SECRET
          valueFrom:
            secretKeyRef:
              key: latest
              name: nextauth-secret-dev
        - name: DISCORD_CLIENT_ID
          valueFrom:
            secretKeyRef:
              key: latest
              name: discord-client-id-dev
        - name: DISCORD_CLIENT_SECRET
          valueFrom:
            secretKeyRef:
              key: latest
              name: discord-client-secret-dev
        - name: DISCORD_GUILD_ID
          valueFrom:
            secretKeyRef:
              key: latest
              name: discord-guild-id-dev
        - name: AUTH_TRUST_HOST
          valueFrom:
            secretKeyRef:
              key: latest
              name: auth-trust-host-dev
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              key: latest
              name: database-url-dev
```

### NEXTAUTH_URL の更新手順

Cloud RunのURLが変更された場合は、以下の手順でNEXTAUTH_URLを更新します：

1. 新しいCloud RunのURLを確認：

```bash
$ gcloud run services describe web \
    --region=asia-northeast1 \
    --format='value(status.url)'
```

2. Secret Managerの値を更新：

```bash
$ echo -n "https://web-d6fzgi5mga-an.a.run.app" | \
  gcloud secrets versions add nextauth-url-dev --data-file=-
```

3. 更新を確認：

```bash
gcloud secrets versions access latest --secret=nextauth-url-dev
```

4. サービスを更新（必要な場合）：

```bash
$ gcloud run services update web \
    --region=asia-northeast1 \
    --no-traffic \
    --revision-suffix=fix-auth-url
```

## トラブルシューティング

### セッションAPIのエラー

セッションAPI（/api/auth/session）が500エラーを返す場合：

1. Cloud RunのURLとNEXTAUTH_URLが一致していることを確認
2. 環境変数がすべて正しく設定されていることを確認
3. サービスログでエラーの詳細を確認

```bash
# エラーログの確認
$ gcloud logging read \
    "resource.type=cloud_run_revision AND \
     resource.labels.service_name=web AND \
     severity>=ERROR" \
    --limit=20
```

### 環境変数のデバッグ

トップページの環境変数デバッグ情報で以下の項目を確認：

```
NODE_ENV: production
NEXTAUTH_URL: Secret Managerから設定済み
NEXTAUTH_SECRET: Secret Managerから設定済み
DISCORD_CLIENT_ID: Secret Managerから設定済み
DISCORD_CLIENT_SECRET: Secret Managerから設定済み
DISCORD_GUILD_ID: Secret Managerから設定済み
AUTH_TRUST_HOST: Secret Managerから設定済み
DATABASE_URL: Secret Managerから設定済み
```

### 設定の確認コマンド

すべての設定を一度に確認する場合：

```bash
# サービスの完全な設定を確認
$ gcloud run services describe web \
    --region=asia-northeast1

# 特定の設定のみを確認
$ gcloud run services describe web \
    --region=asia-northeast1 \
    --format='yaml(spec.template.spec)'

# シークレットの一覧を確認
$ gcloud secrets list --filter="name:*-dev"
```

## 注意事項

1. URLの一致
   - NEXTAUTH_URLはCloud RunのURLと完全に一致する必要があります
   - サブパスやパラメータは含めないでください

2. 環境変数の優先順位
   - Secret Managerの値が優先されます
   - 直接設定された環境変数は無視されます

3. デプロイ時の考慮事項
   - 新しいリビジョンはすべての環境変数を継承します
   - シークレットの更新は即時反映されません
   - 完全な反映にはサービスの再デプロイが必要な場合があります

最終更新日: 2025年4月12日
