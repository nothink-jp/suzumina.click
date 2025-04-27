# GCPでのリモートデバッグガイド

このガイドでは、Cloud Code VS Code拡張機能を使用してGoogle Cloud Platform上のサービス（Cloud RunとCloud Functions）のリモートデバッグを設定・実行する方法について説明します。

## 1. 前提条件

- [Cloud Code拡張機能](https://marketplace.visualstudio.com/items?itemName=GoogleCloudTools.cloudcode)がVS Codeにインストールされていること
- Google Cloud CLIがインストールされ、認証が完了していること
- `suzumina-click-firebase` GCPプロジェクトへのアクセス権限があること

## 2. ローカルデバッグ

### 2.1 Next.jsアプリケーション

1. VS Codeのデバッグパネルを開きます。
2. ドロップダウンメニューから「Next.js: デバッグ」を選択します。
3. 緑の再生ボタンをクリックしてデバッグセッションを開始します。
4. アプリケーションが開発モードで起動し、ブレークポイントで停止するようになります。

### 2.2 Cloud Functions

1. VS Codeのデバッグパネルを開きます。
2. ドロップダウンメニューから「Cloud Functions: ローカルデバッグ」を選択します。
3. 緑の再生ボタンをクリックしてデバッグセッションを開始します。
4. 自動的に関数がビルドされ、デバッグモードで起動します。
5. HTTPリクエストやPubSubイベントをエミュレートして関数を呼び出すと、ブレークポイントで停止します。

## 3. Cloud Runのリモートデバッグ

Cloud Run上で実行されているNext.jsアプリケーションのリモートデバッグを設定します。

### 3.1 ソースマップの有効化

1. Next.jsの設定でソースマップ生成を有効にします（`next.config.ts`）:

```typescript
// apps/web/next.config.ts
const nextConfig = {
  // ...other config
  productionBrowserSourceMaps: true,
};
```

2. Dockerfileを更新して、ビルド時にソースマップを含めるようにします:

```dockerfile
# apps/web/Dockerfile
# ...existing code...

# ソースマップを含める
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/.next/server ./.next/server

# ...existing code...
```

### 3.2 デバッグの実行

1. GCPコンソールでCloud Runサービスにデバッグを有効にします:
   - Cloud Runサービス「suzumina-click-nextjs-app」を選択
   - 「編集と新しいリビジョンのデプロイ」をクリック
   - 「コンテナ」タブで「デバッグを有効にする」にチェック
   - 「デプロイ」をクリック

2. VS Codeのデバッグパネルを開きます。
3. ドロップダウンメニューから「GCP: Cloud Run デバッグ」を選択します。
4. 緑の再生ボタンをクリックしてデバッグセッションを開始します。
5. プロンプトが表示されたら、GCPプロジェクトとリージョンを選択します。
6. 接続が確立されると、コードにブレークポイントを設定できます。

## 4. Cloud Functionsのリモートデバッグ

Cloud Functions上で実行されている関数のリモートデバッグを設定します。

### 4.1 ソースマップの有効化

Cloud Functions v2では、デプロイ時にソースマップが自動的に含まれます。特別な設定は必要ありません。

### 4.2 デバッグの実行

1. VS Codeのデバッグパネルを開きます。
2. ドロップダウンメニューから「GCP: Cloud Functions デバッグ」を選択します。
3. 緑の再生ボタンをクリックしてデバッグセッションを開始します。
4. プロンプトが表示されたら、関数名（例：`fetchYouTubeVideos`）を選択します。
5. 接続が確立されると、コードにブレークポイントを設定できます。
6. 関数が次回呼び出されたときに、ブレークポイントで停止します。

## 5. トラブルシューティング

### 5.1 接続の問題

リモートサービスに接続できない場合:

1. GCPの認証が有効かを確認:
   ```bash
   gcloud auth login
   gcloud config set project suzumina-click-firebase
   ```

2. 適切な権限があることを確認:
   - Cloud Runの場合: `roles/run.admin`
   - Cloud Functionsの場合: `roles/cloudfunctions.developer`

### 5.2 ブレークポイントが機能しない

ブレークポイントで停止しない場合:

1. ソースマップがビルドに含まれているか確認
2. デプロイしたコードとローカルコードが同期しているか確認
3. デバッガがソースマップを正しく読み込んでいるか確認:
   - VS Codeの「デバッグコンソール」タブで確認

### 5.3 タイムアウトの問題

デバッグ中にタイムアウトが発生する場合:

- Cloud Runの場合: サービスのタイムアウト設定を増やす（最大60分）
- Cloud Functionsの場合: 関数のタイムアウト設定を増やす（最大9分）

## 6. ベストプラクティス

1. **本番環境でのデバッグは避ける**: デバッグはステージング環境で行いましょう。
2. **機密情報に注意**: デバッグ中に機密情報が表示される可能性があります。
3. **デバッグ後の設定戻し**: デバッグ完了後は、本番環境のデバッグ設定を無効に戻しましょう。
4. **ログ併用**: リモートデバッグとCloud Loggingを併用すると効果的です。