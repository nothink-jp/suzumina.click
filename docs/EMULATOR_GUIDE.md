# Firebase Emulatorの使用ガイド

このガイドでは、Cloud Code VS Code拡張機能を使ったローカル開発環境でのFirebase Emulatorの設定と使用方法について説明します。

## 1. 前提条件

- [Node.js](https://nodejs.org/) v22以上
- [PNPM](https://pnpm.io/) v10以上
- [Firebase CLI](https://firebase.google.com/docs/cli)
- VS Codeと[Cloud Code拡張機能](https://marketplace.visualstudio.com/items?itemName=GoogleCloudTools.cloudcode)

## 2. エミュレータの設定

### 2.1 環境変数の設定

`apps/web/.env.local`ファイルにエミュレータ使用フラグを追加します：

```
# エミュレータ使用設定
NEXT_PUBLIC_USE_EMULATOR=true
```

`apps/functions/.env.local`ファイルにも同様のフラグを追加します：

```
# エミュレータ使用設定
FUNCTIONS_EMULATOR=true
```

### 2.2 エミュレータの起動

プロジェクトルートディレクトリで以下のコマンドを実行します：

```bash
# エミュレータを起動する
pnpm emulator:start

# または、データのインポート/エクスポート機能付きで起動する
pnpm emulator:start-with-data
```

エミュレータが起動すると、以下のサービスがローカルで利用可能になります：

- **Firebase Authentication**: http://localhost:9099
- **Firestore Database**: http://localhost:8080
- **Emulator UI**: http://localhost:4000

## 3. エミュレータUIの使用方法

エミュレータUIは、ローカル開発環境でのFirebaseサービスの状態を確認・操作するための便利なインターフェイスを提供します。

### 3.1 認証ユーザーの管理

1. Emulator UIの「Authentication」タブを開きます。
2. 「Add user」ボタンをクリックして、テストユーザーを追加できます。
3. 既存のユーザーを編集または削除することも可能です。

### 3.2 Firestoreデータの管理

1. Emulator UIの「Firestore」タブを開きます。
2. データベース内のコレクションとドキュメントを閲覧・編集できます。
3. 新しいコレクションやドキュメントを追加することも可能です。

## 4. アプリケーションでのエミュレータの使用

### 4.1 Webアプリケーション（Next.js）

Webアプリでは、`NEXT_PUBLIC_USE_EMULATOR=true`環境変数が設定されている場合、Firebase認証とFirestoreのクライアントが自動的にエミュレータに接続します。特別な追加設定は必要ありません。

### 4.2 Cloud Functions

Cloud Functionsでは、`FUNCTIONS_EMULATOR=true`環境変数が設定されている場合、Firestoreクライアントが自動的にエミュレータに接続します。

## 5. テストデータのエクスポート/インポート

エミュレータの状態を保存して、次回の起動時に復元することができます：

```bash
# エミュレータのデータをエクスポート
pnpm emulator:export-data

# エクスポートしたデータを使ってエミュレータを起動
pnpm emulator:start-with-data
```

エクスポートされたデータは`./emulator-data`ディレクトリに保存されます。

## 6. トラブルシューティング

### ポート競合の問題

別のアプリケーションが同じポートを使用している場合、エミュレータの起動に失敗することがあります。その場合は、`firebase.json`ファイルのポート設定を変更してください。

### 接続の問題

エミュレータに接続できない場合は、以下を確認してください：

1. エミュレータが実行中であること
2. 環境変数`NEXT_PUBLIC_USE_EMULATOR`または`FUNCTIONS_EMULATOR`が`true`に設定されていること
3. アプリケーションが正しいポートを使用していること

## 7. Cloud Codeとの連携

VS Codeの「Cloud Code」パネルから、以下の機能を利用できます：

1. **ローカルエミュレータ管理**：「Emulators」セクションでエミュレータの起動・停止
2. **Firestore Explorer**：FirestoreデータベースのGUIエクスプローラー
3. **ログビューア**：エミュレータとアプリケーションのログを一元管理

詳細については、VS Codeで「Cloud Code」パネルを開き、各機能のヘルプドキュメントを参照してください。