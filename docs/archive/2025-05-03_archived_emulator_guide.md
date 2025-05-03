# [アーカイブ] Firebase エミュレーターガイド

**注意: このドキュメントは2025年5月3日にアーカイブ化されました**

> **重要**: 2025年5月の環境整理により、Firebase Emulatorを使用したローカル開発は推奨されなくなりました。
> 代わりに、**Cloud Codeを使用したリモート開発環境**に完全に移行しています。
> 最新の開発手順については [CLOUD_CODE_INTEGRATION.md](./CLOUD_CODE_INTEGRATION.md) および
> [DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md) を参照してください。

## なぜEmulatorからCloud Codeに移行したのか

1. **インフラとコードの一元管理**: 
   - すべてのFirebaseリソース（Firestore, Authentication, Security Rules, Indexes）はTerraformで一元管理されるようになりました
   - `firebase.json`と`firestore.rules`ファイルは削除され、重複管理が解消されました

2. **一貫した開発環境**:
   - ローカル環境とリモート環境の差異によるバグが発生しなくなりました
   - チーム全体で同一の環境を使用できます

3. **実環境に近い開発体験**:
   - 本番環境により近い状態でのテストが可能になりました
   - リアルタイムのデバッグ機能を活用できます

4. **開発効率の向上**:
   - エミュレータの起動・設定にかかる時間を削減
   - GCPの最新機能をすぐに利用可能

## 新しい開発フロー

以下のドキュメントを参照して、新しい開発フローを理解してください：

- [Cloud Code統合ガイド](./CLOUD_CODE_INTEGRATION.md): VS Code Cloud Code拡張機能の設定と使用方法
- [開発環境セットアップ](./DEVELOPMENT_SETUP.md): 開発環境のセットアップ手順
- [リモートデバッグガイド](./REMOTE_DEBUGGING.md): リモート環境でのデバッグ方法
- [Terraformローカル実行](./TERRAFORM_LOCAL.md): Terraformを使用したインフラ管理

---

## 以下はアーカイブ情報です（参照のみ）

このセクションは参照目的でのみ残されています。現在の開発には使用しないでください。

### 旧エミュレーター起動方法

```bash
# 非推奨: Firebase Emulatorの起動
pnpm emulator:start
```

### 旧環境変数設定

以前は`apps/web/.env.local`ファイルに以下の環境変数を設定していました：

```
# 非推奨: この設定は不要になりました
NEXT_PUBLIC_USE_EMULATOR=true
```