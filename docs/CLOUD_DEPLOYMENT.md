# Cloud Codeを使用したGCPデプロイガイド

このガイドでは、VS CodeのCloud Code拡張機能を使用して、Google Cloud Platform（GCP）へのアプリケーションデプロイを行う方法について説明します。

## 1. 前提条件

- VS Codeの[Cloud Code拡張機能](https://marketplace.visualstudio.com/items?itemName=GoogleCloudTools.cloudcode)がインストールされていること
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)がインストールされ、認証が完了していること
- Dockerがインストールされ、実行可能であること
- `suzumina-click-firebase` GCPプロジェクトへのデプロイ権限があること

## 2. デプロイの準備

### 2.1 認証の設定

以下のコマンドを実行して、Google Cloudに認証します：

```bash
# Googleアカウントにログイン
gcloud auth login

# プロジェクトを設定
gcloud config set project suzumina-click-firebase

# アプリケーションのデフォルト認証情報を設定
gcloud auth application-default login
```

### 2.2 Artifact Registryの設定

コンテナイメージをプッシュするために、Artifact Registryの認証を設定します：

```bash
# Artifact Registry認証を設定
gcloud auth configure-docker asia-northeast1-docker.pkg.dev
```

## 3. Cloud Codeを使用したデプロイ

### 3.1 Cloud Run へのデプロイ（Next.jsアプリケーション）

1. VS Codeで「Cloud Code」パネルを開きます（サイドバーのCloud Codeアイコンをクリック）。
2. 「Cloud Run」セクションを展開します。
3. 「Deploy to Cloud Run」をクリックします。
4. プロンプトが表示されたら以下の情報を指定します：
   - プロジェクト: `suzumina-click-firebase`
   - リージョン: `asia-northeast1`
   - サービス: `suzumina-click-nextjs-app`
   - 使用するSkaffoldプロファイル: `staging`（または`dev`）
5. デプロイが開始され、ビルドからデプロイまでの進捗がVS Codeの出力パネルに表示されます。
6. デプロイが完了すると、サービスURLがコンソールに表示されます。

### 3.2 Cloud Functions へのデプロイ

1. VS Codeで「Cloud Code」パネルを開きます。
2. 「Cloud Functions」セクションを展開します。
3. 「Deploy Cloud Function」をクリックします。
4. プロンプトが表示されたら以下の情報を指定します：
   - プロジェクト: `suzumina-click-firebase`
   - リージョン: `asia-northeast1`
   - ランタイム: `nodejs20`
   - 関数名: デプロイしたい関数名（例: `fetchYouTubeVideos`）
   - ソースディレクトリ: `apps/functions`
   - エントリポイント: 関数のエントリポイント名（例: `fetchYouTubeVideos`）
   - トリガータイプ: 関数のトリガータイプ（例: `pubsub`）
5. デプロイが開始され、ビルドからデプロイまでの進捗がVS Codeの出力パネルに表示されます。
6. デプロイが完了すると、コンソールに成功メッセージが表示されます。

## 4. デプロイ構成ファイル

プロジェクトには、Cloud Codeがデプロイに使用する以下の構成ファイルが含まれています：

- **skaffold.yaml**: アプリケーションのビルドとデプロイの設定を定義
- **apps/web/Dockerfile**: Next.jsアプリケーションのコンテナイメージビルド設定

これらのファイルは既に最適化されており、通常は変更する必要はありません。

## 5. 環境変数とシークレット

Cloud Runサービスにデプロイする際、環境変数とシークレットは自動的に設定されます。これらはTerraformで定義されており、Cloud Codeのデプロイ中に適用されます。

必要に応じて、デプロイ中に追加の環境変数を設定することも可能です：

1. Cloud Runデプロイプロンプトで「環境変数の追加」を選択
2. 変数名と値を入力（例: `DEBUG=true`）

## 6. デプロイのスケジュール設定

定期的なデプロイが必要な場合、Cloud Scheduler と Cloud Build を組み合わせて自動デプロイを設定できます：

1. Cloud Buildトリガーを作成（コミット、タグ、またはスケジュールベース）
2. ビルド構成を指定（例: `cloudbuild.yaml`）
3. Cloud Schedulerでスケジュールを設定（例: 毎日午前2時）

詳細については、[Cloud Build のドキュメント](https://cloud.google.com/build/docs/automating-builds/create-scheduled-builds)を参照してください。

## 7. トラブルシューティング

### 7.1 認証エラー

```
ERROR: Permission denied: ...
```

- `gcloud auth login` を再実行
- 適切なIAM権限があることを確認

### 7.2 ビルドエラー

```
ERROR: Build failed: ...
```

- ローカルでのビルドを確認
- Dockerfileが正しいか確認
- 依存関係が正しくインストールされているか確認

### 7.3 デプロイエラー

```
ERROR: Deployment failed: ...
```

- サービス名が正しいか確認
- リージョンとプロジェクトIDが正しいか確認
- IAM権限が適切か確認

## 8. 関連リソース

- [Cloud Code ドキュメント](https://cloud.google.com/code/docs/vscode)
- [Cloud Run ドキュメント](https://cloud.google.com/run/docs)
- [Cloud Functions ドキュメント](https://cloud.google.com/functions/docs)
- [Skaffold ドキュメント](https://skaffold.dev/docs/)

---

このガイドは、Cloud Codeを使用したGCPデプロイの基本的な手順を説明しています。詳細な情報やカスタマイズについては、上記の関連リソースを参照してください。