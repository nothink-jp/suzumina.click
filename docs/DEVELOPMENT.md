# 開発ガイド

## 📋 概要

本ドキュメントでは、suzumina.clickプロジェクトの開発ガイド、設計原則、コーディング規約、および品質基準を定義します。

**技術スタック**: Next.js 15 App Router、TypeScript 5.8、Tailwind CSS v4、Storybook (UI Package一本化)  
**開発体制**: 個人開発・個人運用（2環境構成: Staging + Production）  
**バージョン**: v0.2.4 (高度検索フィルタリング完全実装 + 15+パラメータ検索)  
**更新日**: 2025年7月1日

## 🎯 設計原則

### 1. 型安全性の確保

**原則**: すべてのデータ構造は型安全であること

- **TypeScript**: strict モードを使用し、`any` 型の使用を原則禁止
- **Zod Schema**: 実行時の型検証を実装
- **共有型定義**: packages/shared-types による一元管理

```typescript
// ✅ 良い例: Zodスキーマによる型定義
export const VideoSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  publishedAt: z.string().datetime()
});

// ❌ 悪い例: any型の使用
function processData(data: any) { ... }
```

### 2. 関数設計原則

**原則**: 純粋関数を優先し、副作用を最小化する

- **純粋関数**: 同じ入力に対して常に同じ出力を返す
- **短い関数**: 1つの関数は1つの責任のみを持つ
- **単一責任原則**: 明確で理解しやすい関数名

```typescript
// ✅ 良い例: 純粋関数
export function formatPrice(price: number, currency = 'JPY'): string {
  return `${price.toLocaleString()}円`;
}

// ❌ 悪い例: 副作用のある関数
function updateAndLog(data: any) {
  updateDatabase(data); // 副作用
  console.log(data);    // 副作用
  return data;
}
```

### 3. コードコロケーション

**原則**: 関連するコードは近接して配置する

```
components/
├── voice-button/
│   ├── voice-button.tsx      # メインコンポーネント
│   ├── voice-button.test.tsx # テスト
│   ├── voice-button.types.ts # 型定義
│   └── index.ts              # エクスポート
```

### 4. 可読性優先

**原則**: パフォーマンスよりも可読性を優先する

- 明確な変数名・関数名を使用
- 適切なコメントの追加
- 複雑なロジックの分割

### 5. Next.js 15準拠設計

**原則**: Server Component/Client Component を適切に分離する

- **Server Components**: データ取得・表示ロジック
- **Client Components**: インタラクション・ブラウザAPI使用
- **Server Actions**: サーバーサイドデータ操作
- **Firestore接続制限**: `@google-cloud/firestore` をサーバーサイドのみで使用

```typescript
// ✅ 良い例: Server Action (ページと同じディレクトリに配置)
// app/works/actions.ts
'use server';

import { firestore } from '@/lib/firestore';

export async function getWorks() {
  const snapshot = await firestore.collection('works').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ❌ 悪い例: クライアントサイドFirebase
// import { initializeApp } from 'firebase/app';
// import { getFirestore } from 'firebase/firestore';
```

### 6. コンポーネント設計原則

**原則**: Server Component/Client Component を責任に応じて設計する

- **Server Component**: データ表示、SEO、静的UI部分
- **Client Component**: ユーザーインタラクション、ブラウザAPI、状態管理
- **責任分離**: 表示ロジックとインタラクションロジックの明確な分離
- **Storybook対応**: UIコンポーネント開発・テスト環境の活用

```typescript
// ✅ 良い例: Server Component + Client Component分離
// VideoList.tsx (Server Component)
export default function VideoList({ data, totalCount, currentPage }) {
  return (
    <div>
      {data.videos.map(video => <VideoCard key={video.id} video={video} />)}
      <Pagination currentPage={currentPage} totalPages={totalPages} />
    </div>
  );
}

// Pagination.tsx (Client Component)
"use client";
export default function Pagination({ currentPage, totalPages }) {
  const router = useRouter();
  const handlePageChange = (page) => router.push(`?page=${page}`);
  // インタラクションロジック
}

// ❌ 悪い例: Client ComponentでServer Actions直接呼び出し
"use client";
function VideoList() {
  const [data, setData] = useState();
  const handlePageChange = async (page) => {
    const newData = await getVideoTitles({ page }); // アンチパターン
    setData(newData);
  };
}
```

**Storybook開発原則**:
- **コンポーネント単位開発**: 個別コンポーネントの開発・テスト
- **Next.js App Router対応**: `useRouter`などのNext.jsフックのモック設定
- **UI/UXテスト**: 視覚的なコンポーネントテスト環境
- **デザインシステム**: 一貫したUIコンポーネントライブラリ構築
- **デザイントークン**: 色・スペース・タイポグラフィの体系的管理

## 🧪 テスト戦略

### テストアプローチ

**Red-Green-Refactor サイクル**

1. **Red**: 失敗するテストを書く
2. **Green**: テストを通すための最小限のコードを書く
3. **Refactor**: コードを改善する

**Arrange-Act-Assert パターン**

```typescript
describe('formatPrice', () => {
  it('should format price with comma separators', () => {
    // Arrange
    const price = 1000;
    
    // Act
    const result = formatPrice(price);
    
    // Assert
    expect(result).toBe('1,000円');
  });
});
```

### テスト構造・配置戦略

#### **ディレクトリ構造統一原則**

**✅ 推奨: コロケーション方式**
```
src/
├── components/
│   ├── AudioButton.tsx
│   ├── AudioButton.test.tsx         # ✅ 同一ディレクトリ
│   ├── SearchForm.tsx
│   └── SearchForm.test.tsx          # ✅ 同一ディレクトリ
├── lib/
│   ├── firestore.ts
│   ├── firestore.test.ts            # ✅ 同一ディレクトリ
│   ├── audio-helpers.ts
│   └── audio-helpers.test.ts        # ✅ 同一ディレクトリ
├── app/
│   ├── buttons/
│   │   ├── page.tsx
│   │   ├── page.test.tsx            # ✅ 同一ディレクトリ
│   │   ├── actions.ts
│   │   └── actions.test.ts          # ✅ 同一ディレクトリ
│   └── api/
│       └── search/
│           ├── route.ts
│           └── route.test.ts        # ✅ 同一ディレクトリ
└── e2e/                             # ✅ E2Eテスト専用ディレクトリ
    ├── auth.spec.ts
    └── buttons.spec.ts
```

**❌ 非推奨: __tests__ ディレクトリ方式**
```
src/
├── components/
│   ├── __tests__/                   # ❌ 分離されすぎ
│   │   ├── Button.test.tsx          # ❌ 関連コードから離れている
│   │   └── Form.test.tsx            # ❌ メンテナンス性低下
│   ├── Button.tsx
│   └── Form.tsx
```

#### **ファイル命名規約**

```typescript
// ✅ 正しい命名
component.test.tsx        // React コンポーネント
utility.test.ts          // TypeScript ユーティリティ
page.spec.ts             // E2Eテスト（e2e/ディレクトリ内のみ）

// ❌ 間違った命名
component.spec.tsx       // SpecはE2Eテスト専用
utility.test.js          // TypeScriptプロジェクトでJS使用
test-component.tsx       // 接頭辞形式は非推奨
```

#### **テストファイル種別・配置ルール**

| テスト種別 | ファイル拡張子 | 配置場所 | 例 |
|-----------|---------------|----------|-----|
| **React Component** | `.test.tsx` | コンポーネントと同一ディレクトリ | `AudioButton.test.tsx` |
| **Custom Hook** | `.test.ts` | フックと同一ディレクトリ | `useDebounce.test.ts` |
| **Server Action** | `.test.ts` | アクションと同一ディレクトリ | `actions.test.ts` |
| **API Route** | `.test.ts` | ルートと同一ディレクトリ | `route.test.ts` |
| **Utility/Library** | `.test.ts` | ソースファイルと同一ディレクトリ | `firestore.test.ts` |
| **Page Component** | `.test.tsx` | ページと同一ディレクトリ | `page.test.tsx` |
| **E2E Test** | `.spec.ts` | `e2e/` ディレクトリ内 | `auth.spec.ts` |
| **Middleware** | `.test.ts` | ソースファイルと同一ディレクトリ | `middleware.test.ts` |

### テスト粒度・内容ガイドライン

#### **1. Component Tests (.test.tsx)**
```typescript
// ✅ 良い例: 完全なコンポーネントテスト
describe('AudioButton', () => {
  it('should render button with correct title', () => {
    render(<AudioButton title="テスト音声" />);
    expect(screen.getByText('テスト音声')).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const handleClick = vi.fn();
    render(<AudioButton onClick={handleClick} />);
    
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('should be accessible on different viewports', () => {
    render(<AudioButton />);
    const button = screen.getByRole('button');
    validateAccessibleTouchTarget(button); // 共有テストユーティリティ使用
  });
});
```

#### **2. Hook Tests (.test.ts)**
```typescript
// ✅ 良い例: カスタムフックテスト
describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce value updates', () => {
    const { result, rerender } = renderHook((value) => useDebounce(value, 500), {
      initialProps: 'initial',
    });

    expect(result.current).toBe('initial');

    rerender('updated');
    expect(result.current).toBe('initial'); // まだ変更されない

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe('updated'); // デバウンス後に変更
  });
});
```

#### **3. Server Action Tests (.test.ts)**
```typescript
// ✅ 良い例: Server Actionテスト
describe('Audio Button Actions', () => {
  beforeEach(() => {
    mockFirestore();
  });

  it('should create audio button successfully', async () => {
    const mockUser = createMockUser();
    const input = createValidAudioButtonInput();

    const result = await createAudioButton(input, mockUser);

    expect(result.success).toBe(true);
    expect(mockFirestore.collection).toHaveBeenCalledWith('audioButtons');
  });

  it('should handle validation errors', async () => {
    const invalidInput = { title: '' }; // 無効な入力

    const result = await createAudioButton(invalidInput, mockUser);

    expect(result.success).toBe(false);
    expect(result.error).toContain('タイトルは必須です');
  });
});
```

#### **4. API Route Tests (.test.ts)**
```typescript
// ✅ 良い例: API Routeテスト
describe('/api/search', () => {
  it('should return search results', async () => {
    const request = new NextRequest('http://localhost/api/search?q=test');
    
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('results');
  });

  it('should handle query parameter validation', async () => {
    const request = new NextRequest('http://localhost/api/search?limit=invalid');
    
    const response = await GET(request);

    expect(response.status).toBe(400);
  });
});
```

### 共有テストユーティリティの活用

#### **レスポンシブテスト (@packages/ui/test-utils)**
```typescript
import { validateAccessibleTouchTarget, testAcrossViewports } from '@suzumina.click/ui/test-utils/responsive-testing';

// ✅ 推奨: 共有ユーティリティの活用
describe('Button Component', () => {
  testAcrossViewports('should be accessible on all devices', (viewport) => {
    render(<Button />);
    const button = screen.getByRole('button');
    validateAccessibleTouchTarget(button);
  });
});
```

#### **モック作成ヘルパー**
```typescript
// test-utils/mock-helpers.ts (作成推奨)
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  name: 'テストユーザー',
  ...overrides,
});

export const createMockAudioButton = (overrides = {}) => ({
  id: 'button-123',
  title: 'テスト音声',
  ...overrides,
});
```

### カバレッジ目標

- **最小カバレッジ**: 80%
- **重要な関数**: 100%カバレッジ
- **エッジケース**: 必ずテストする
- **セキュリティ関連**: middleware・認証系は100%カバレッジ
- **データベース操作**: Firestore操作は完全モック・完全カバレッジ

### テスト種別

- **Unit Tests**: 個別関数・コンポーネントのテスト (30+件 実装済み)
- **Storybook Tests**: UIコンポーネントの視覚的テスト (UI Package管理)
- **Integration Tests**: API連携・Server Actionテスト (実装済み)
- **E2E Tests**: ユーザーシナリオテスト (6件 実装済み)

## 🔧 開発ワークフロー

### 1. ブランチ戦略

**Trunk-based Development + GitHub Flow**

```
main (production)
├── feature/add-voice-button-filter
├── feature/improve-dlsite-parser
└── hotfix/fix-youtube-api-error
```

### 2. コミット規約

**Conventional Commits**

```bash
feat: 新機能の追加
fix: バグ修正
docs: ドキュメント更新
style: フォーマット変更
refactor: リファクタリング
test: テスト追加・修正
chore: その他の変更

# 例
feat: add voice button filtering by tags
fix: resolve youtube api quota exceeded error
docs: update api documentation
```

### 3. 実装後チェックリスト

**必須項目（Git フック自動実行）**

- [ ] 包括チェック: `pnpm check` (Lint + フォーマット + 型チェック)
- [ ] テスト実行: `pnpm test`
- [ ] ビルド確認: `pnpm build`

**品質状況（2025年6月現在）**

- ✅ **Lint状態**: 全パッケージ 0エラー・0警告達成
- ✅ **依存関係**: Biome 2.0.6、React 19等最新版
- ✅ **セキュリティ**: Firebase依存関係完全削除
- ✅ **Git フック**: Lefthook による品質チェック自動化

**推奨項目**

- [ ] カバレッジ確認: `pnpm test:coverage`
- [ ] Storybook確認: UIコンポーネント表示テスト
- [ ] E2Eテスト: `pnpm test:e2e`（重要機能）

## 🏗️ アーキテクチャ原則

### 1. 責任分離

**実装済みレイヤー構造**

```
apps/web/                     # 本番Webアプリ
├── src/
│   ├── app/                 # Next.js App Router (Server Components)
│   ├── components/          # UIコンポーネント
│   │   ├── VideoList.tsx    # Server Component (表示ロジック)
│   │   └── Pagination.tsx   # Client Component (インタラクション)
│   └── lib/                 # ユーティリティ

packages/ui/                  # 共有UIコンポーネント
├── src/
│   ├── components/          # Radix UIベースコンポーネント
│   └── styles/              # Tailwind CSS v4設定
└── .storybook/              # UI開発環境

apps/functions/               # バックエンド
├── src/
│   ├── dlsite.ts            # DLsite作品取得
│   ├── youtube.ts           # YouTube動画取得
│   └── utils/               # ドメインロジック
```

### 2. 依存関係管理

**依存関係の方向**

```
UI層 → ビジネスロジック層 → データアクセス層
```

- 上位層は下位層に依存する
- 下位層は上位層に依存しない
- 循環依存を禁止

### 3. エラーハンドリング

**階層別エラー処理**

```typescript
// Cloud Functions
export async function fetchYouTubeVideos(event: CloudEvent) {
  try {
    const result = await fetchYouTubeVideosLogic();
    if (result.error) {
      logger.warn(`YouTube動画取得処理でエラー: ${result.error}`);
    }
  } catch (error) {
    logger.error('予期しないエラー:', error);
    await updateMetadata({ 
      isInProgress: false,
      lastError: error instanceof Error ? error.message : String(error)
    });
  }
}

// Frontend
export function VideoCard({ video }: { video: VideoData }) {
  if (!video) {
    return <ErrorAlert message="動画データが見つかりません" />;
  }
  // ...
}
```

## 🎨 デザインシステム・UI開発

### デザイントークン体系

**ブランドカラーパレット**:
- **suzuka colors**: 涼花みなせメインピンク系（50～950の10段階）
- **minase colors**: 涼花みなせオレンジ系（50～950の10段階）

**トークン構成**:
```text
packages/ui/src/components/design-tokens/
├── color-palette.stories.tsx    # ブランドカラー + セマンティックカラー
├── typography.stories.tsx       # フォントサイズ・行間・ウェイト
├── spacing.stories.tsx          # 4px基準のスペーシング
├── borders-shadows.stories.tsx  # 角丸・ボーダー・シャドウ
└── icons.stories.tsx           # Lucide Reactアイコンセット
```

**使用例**:
```typescript
// ✅ 良い例: Tailwind CSS v4 + デザイントークン
<Button className="bg-suzuka-500 hover:bg-suzuka-600 text-white">
  メインCTA
</Button>

<Button className="bg-minase-500 hover:bg-minase-600 text-white">
  セカンダリCTA
</Button>

// ✅ 良い例: スペーシングトークン活用
<div className="p-4 mb-6 gap-2">
  {/* 4px基準の一貫したスペーシング */}
</div>
```

### Storybook デザイントークン管理

**Lint設定**: デザイントークンStorybook は `biome.json` でlint除外
- 理由: ドキュメンテーション目的のため未使用変数が多数存在
- 対象: `**/src/components/design-tokens/*.stories.tsx`

**メンテナンス方針**:
- デザイントークンの変更時は対応するStorybookを更新
- 新しいカラー・スペース・アイコン追加時はStorybook反映
- Chromaticによる視覚的回帰テスト対象

## 📦 依存関係管理

### 定期更新コマンド

```bash
# 現状確認
pnpm outdated && pnpm audit

# 安全更新（パッチ・マイナー）
pnpm update

# 各更新後テスト
pnpm test && pnpm typecheck && pnpm build
```

### パッケージ選定基準

1. **アクティブメンテナンス**: 定期的な更新
2. **型安全性**: TypeScript サポート
3. **軽量性**: バンドルサイズ影響の考慮
4. **セキュリティ**: 既知脆弱性なし

## 🔒 セキュリティガイドライン

### 1. 機密情報管理

- **環境変数**: すべての機密情報は環境変数で管理
- **Secret Manager**: Google Cloud Secret Manager を使用
- **ログ出力**: 機密情報をログに出力しない

```typescript
// ✅ 良い例
const apiKey = process.env.YOUTUBE_API_KEY;
if (!apiKey) {
  logger.error('YouTube API Keyが設定されていません');
  return;
}

// ❌ 悪い例
logger.info(`API Key: ${process.env.YOUTUBE_API_KEY}`);
```

### 2. 入力検証

- **Zod Schema**: すべての外部入力を検証
- **サニタイゼーション**: HTMLエスケープの実施
- **CSRFトークン**: 状態変更APIでのトークン検証

### 3. アクセス制御

- **最小権限原則**: 必要最小限の権限のみ付与
- **サービスアカウント**: 機能別に専用アカウントを作成
- **Firestore Rules**: データアクセス制御を実装

### 4. プロジェクトID・認証情報管理

**原則**: ソースコードにプロジェクトIDや機密情報をハードコーディングしない

- **環境変数使用**: `GCP_PROJECT_ID`, `GOOGLE_CLOUD_PROJECT` を使用
- **GitHub Secrets**: CI/CDでは GitHub Actions Secrets を活用
- **ドキュメント**: プレースホルダー値を使用（例: `YOUR_PROJECT_ID`, `${PROJECT_ID}`）

```bash
# ✅ 良い例: GitHub Actionsによるデプロイ（推奨）
# GitHubリポジトリの「Actions」タブから「Deploy to Cloud Run」を実行

# ✅ 良い例: 環境変数の使用
export GCP_PROJECT_ID=your-actual-project-id

# ❌ 悪い例: ハードコーディング
PROJECT_ID="suzumina-click"  # セキュリティリスク
```

**チェックリスト**:
- [ ] スクリプトで環境変数を使用
- [ ] ドキュメントにプレースホルダーを使用
- [ ] GitHub ActionsでSecretsを使用
- [ ] .gitignoreに機密ファイルを追加

## 📊 パフォーマンス基準

### 1. フロントエンド

- **Core Web Vitals**
  - LCP (Largest Contentful Paint): < 2.5s
  - FID (First Input Delay): < 100ms
  - CLS (Cumulative Layout Shift): < 0.1

- **バンドルサイズ**: 初期ロードは500KB以下

### 2. バックエンド

- **Cloud Functions**
  - コールドスタート: < 5秒
  - レスポンス時間: < 3秒
  - メモリ使用量: 512MB以下

- **データベース**
  - クエリレスポンス: < 1秒
  - インデックス最適化の実施

## 📝 ドキュメンテーション

### 1. コメント規約

**JSDoc形式**

```typescript
/**
 * DLsiteから作品情報を取得する
 * 
 * @param page - 取得するページ番号
 * @returns 作品データの配列
 * @throws {Error} APIエラーまたはパースエラー
 */
export async function fetchDLsiteWorks(page: number): Promise<WorkData[]> {
  // 実装...
}
```

### 2. README更新

- 新機能追加時はREADMEを更新
- 破壊的変更は移行ガイドを作成
- API変更はCHANGELOG.mdに記録

## 🚀 デプロイメント原則

### 1. 環境分離

- **production**: 本番環境
- **preview**: プルリクエスト確認用

### 2. デプロイフロー

```mermaid
graph LR
    A[Code Push] --> B[GitHub Actions]
    B --> C[Tests]
    C --> D[Build]
    D --> E[Deploy Preview]
    E --> F[Manual Review]
    F --> G[Deploy Production]
```

### 3. ロールバック戦略

- **即座にロールバック**: 重大なバグ発見時
- **段階的デプロイ**: 新機能の段階的公開
- **モニタリング**: デプロイ後の継続監視

## 🔍 品質保証

### 1. 自動化チェック

- **Pre-commit hooks**: Lefthook による自動チェック
- **CI/CD**: GitHub Actions による継続的テスト
- **依存関係**: Dependabot による自動更新

### 2. コードレビュー

- **必須レビュー**: すべてのPRに1名以上のレビュー
- **チェック項目**:
  - 設計原則への準拠
  - テストカバレッジ
  - セキュリティ考慮
  - パフォーマンス影響

### 3. 定期監査

- **月次**: 依存関係の脆弱性チェック
- **四半期**: アーキテクチャレビュー
- **年次**: 技術スタック見直し

## 📚 参考資料

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Google Cloud Functions Best Practices](https://cloud.google.com/functions/docs/bestpractices)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Clean Code](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350884)

---

**最終更新**: 2025年6月16日  
**次回レビュー予定**: 2025年12月16日