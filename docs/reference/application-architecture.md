# アプリケーションアーキテクチャ

このドキュメントは、suzumina.clickのアプリケーションレベルのアーキテクチャを説明します。

## 関連ドキュメント

- [インフラストラクチャアーキテクチャ](infrastructure-architecture.md) - GCPインフラとデプロイメント
- [ドメインモデル](domain-model.md) - ドメイン駆動設計
- [データベーススキーマ](database-schema.md) - Firestoreデータ構造

## アーキテクチャ概要

suzumina.clickは、Next.js 16を基盤としたモダンなWebアプリケーションです。

### 技術スタック

- **フロントエンド**: Next.js 16 (App Router), React 19, TypeScript, React Compiler
- **スタイリング**: Tailwind CSS v4, shadcn/ui
- **バックエンド**: Server Actions, Cloud Functions
- **データベース**: Cloud Firestore
- **認証**: better-auth (Discord OAuth)
- **バリデーション**: Zod v4, React Hook Form
- **メール**: Resend
- **チャート**: Recharts（価格履歴グラフ）
- **同意管理**: Cookie Consent / Google Consent Mode（GDPR対応）

## レイヤードアーキテクチャ

```
┌─────────────────────────────────────────────┐
│          Presentation Layer                  │
│  (React Components, Server Components)       │
├─────────────────────────────────────────────┤
│          Application Layer                   │
│  (Server Actions, API Routes)               │
├─────────────────────────────────────────────┤
│          Domain Layer                        │
│  (Entities, Value Objects, Services)        │
├─────────────────────────────────────────────┤
│          Infrastructure Layer                │
│  (Firestore, External APIs, Cloud Storage)  │
└─────────────────────────────────────────────┘
```

### 各レイヤーの責務

#### 1. Presentation Layer
- **React Components**: UIの表示とユーザーインタラクション
- **Server Components**: サーバーサイドレンダリング
- **Client Components**: クライアントサイドインタラクション

#### 2. Application Layer
- **Server Actions**: データ操作とビジネスロジックの実行
  - モジュール化された構造: lib/とutils/でロジックを分離
  - 共通ヘルパー: server-action-wrapper.ts, firestore-helpers.ts
- **API Routes**: 外部APIとの通信（廃止予定）

#### 3. Domain Layer
- **Entities**: ビジネスエンティティ（Work, Video, AudioButton）
- **Value Objects**: 値オブジェクト（Price, Rating, etc.）
- **Domain Services**: ドメイン固有のビジネスロジック

#### 4. Infrastructure Layer
- **Firestore Access**: データベースアクセス
- **External APIs**: YouTube API, DLsite API
- **Cloud Storage**: 音声ファイルストレージ

## コンポーネント構成

### パッケージ構造

```
packages/
├── shared-types/      # 共有型定義とドメインモデル
│   ├── entities/      # エンティティ定義
│   ├── value-objects/ # 値オブジェクト
│   └── plain-objects/ # Server/Client境界用
│
└── ui/               # 共有UIコンポーネント
    └── components/   # shadcn/uiベース

apps/
├── web/              # Next.js Webアプリケーション
└── functions/        # Cloud Functions（バックグラウンド処理）
    └── src/
```

### アプリケーション構造

```
apps/web/src/
├── app/              # Next.js App Router
│   ├── (routes)/     # ページルート
│   ├── works/        # 作品関連
│   │   ├── actions.ts        # Server Actions (551行)
│   │   ├── lib/              # ビジネスロジック
│   │   └── utils/            # データ変換
│   ├── buttons/      # 音声ボタン関連
│   │   ├── actions.ts        # Server Actions (574行)
│   │   ├── lib/              # ビジネスロジック
│   │   └── utils/            # データ変換
│   └── api/          # API Routes（廃止中）
│
├── components/       # アプリ固有コンポーネント
├── lib/             # 共通ヘルパー
│   ├── server-action-wrapper.ts  # エラーハンドリング統一
│   └── firestore-helpers.ts      # Firestore操作汎用化
└── hooks/           # カスタムフック
```

## データフロー

### 1. 読み取りフロー
```
Client Component
    ↓ (Server Component)
Server Action
    ↓ (Entity.fromFirestore)
Firestore
    ↓ (Entity)
Server Action
    ↓ (toPlainObject)
Client Component
```

### 2. 書き込みフロー
```
Client Component
    ↓ (Form Action)
Server Action
    ↓ (Entity.create)
Entity Validation
    ↓ (toFirestore)
Firestore
```

## 設計原則

### 1. Server Componentsファースト
- 可能な限りServer Componentsを使用
- クライアントコードを最小化
- SEOとパフォーマンスの最適化

### 2. 型安全性
- TypeScript strict mode
- Zodによるランタイム検証
- 共有型定義パッケージ

### 3. Progressive Enhancement
- JavaScriptなしでも基本機能が動作
- Server Actionsによるフォーム処理
- クライアント側は拡張機能のみ

### 4. ドメイン駆動設計（選択的適用）
- 複雑なドメインにのみEntity適用
- シンプルなCRUDは型定義のみ
- [ADR-001](../decisions/architecture/ADR-001-ddd-implementation-guidelines.md)参照

## セキュリティアーキテクチャ

### 認証・認可
- Discord OAuth (better-auth)
- サーバーサイドセッション管理
- Guild所属による認可

### エラーページ / アクセス制御の応答方針（SPR-169）
ロールベース認可は廃止済み（admin/moderator なし。ユーザーは認証 + `isActive` のみで区別）。
そのため「認証済みだが権限不足」の典型 403 シナリオが存在せず、**専用の 403 ページは設けない**。

| 状況 | 応答 | 実装 |
|---|---|---|
| 未認証で要認証ページ | サインインへ誘導（callbackUrl 付き） | `ProtectedRoute` が `/auth/signin` へ redirect |
| 認証済みだが無効アカウント（`isActive=false`、防御的・通常到達せず） | 汎用エラーページで理由を説明 | `/auth/error?error=AccountDisabled` |
| 認証フロー上のエラー（OAuth 拒否・設定不備など） | 汎用エラーページ | `/auth/error?error=...`（AccessDenied / Configuration / Verification） |
| リソース不在・閲覧者に出してはいけない非公開ルート（例: 他人の編集ページ） | 404 | `notFound()` → `not-found.tsx` |
| 取得時の予期せぬ例外 | 500 相当 | 各 `error.tsx`（reset 付き） |

- 専用の 403/`forbidden()`（Next の `authInterrupts` 実験 API）は採用しない（本番安定性優先・該当シナリオ不在）。
- エラー画面のデザインは全て同一系統（`Card` + suzuka/minase グラデーション + lucide）。`/auth/error` も `not-found.tsx`・各 `error.tsx` に揃える。
- 「閲覧は可能だが編集は不可」のような非作成者アクセスは 403 ではなく `notFound()`（編集ルートを露出しない／作品自体は詳細ページで閲覧可）。

### データ保護
- Firestore Security Rules
- Server Actions経由のデータアクセス
- 環境変数による機密情報管理

## パフォーマンス最適化

### 1. キャッシング戦略
- React Server Component キャッシュ
- Next.js Data Cache
- CDNキャッシュ（静的アセット）

### 2. データ取得最適化
- 並列データ取得
- ページネーション
- 必要最小限のデータ取得

### 3. バンドルサイズ最適化
- Dynamic imports
- Tree shaking
- Component lazy loading

## Cloud Functions アーキテクチャ

### 1. データ収集関数
- **fetchYouTubeVideos**: YouTube動画データの定期収集（毎時30分: `30 * * * *`）
- **fetchDLsiteUnifiedData**: DLsite Individual Info APIによる作品データ統合収集（2時間ごと: `3 */2 * * *`）
- **checkDataIntegrity**: データ整合性チェック（毎週日曜3:00 JST: `0 3 * * 0`）

### 2. checkDataIntegrity関数の詳細
- **実行タイミング**: 毎週日曜日 3:00 JST
- **トリガー**: Cloud Scheduler → Pub/Sub
- **処理内容**:
  - CircleのworkIds配列の重複除去と整合性確認
  - 孤立したCreatorマッピングのクリーンアップ
  - Work-Circle相互参照の整合性確認
  - 削除されたCreator-Work関連の自動復元
- **結果保存**: `dlsiteMetadata/dataIntegrityCheck`ドキュメント

## セキュリティ・プライバシーアーキテクチャ

### GDPR・Cookie同意管理
- **Google Consent Mode v2**: プライバシー設定に応じた広告計測の調整
- **Cookie同意バナー**: 初回訪問時のオプトイン取得
- **Cookie設定パネル**: ユーザーが後からカテゴリ別に設定変更可能
- **実装箇所**: `src/components/consent/`

### 年齢認証ゲート
- R18コンテンツの表示制御
- Context API（`age-verification-context.tsx`）による状態管理
- セッション単位での認証状態保持
- **実装箇所**: `src/components/consent/age-verification-*.tsx`, `src/contexts/`

## 今後の方向性

1. **API Routes**: `/api/auth`（better-auth）と `/api/health`（ヘルスチェック）は引き続き稼働。それ以外は Server Actions に集約済み。

2. **Entity実装の選択的適用**
   - ROIベースの判断
   - [ADR-001](../decisions/architecture/ADR-001-ddd-implementation-guidelines.md) 参照

詳細な実装ガイドは各参照ドキュメントを確認してください。