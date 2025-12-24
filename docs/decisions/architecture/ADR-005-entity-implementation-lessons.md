# ADR-002: Entity実装の教訓と学習事項

## ステータス
承認済み (2025-01-29)

## コンテキスト

2025年1月にCircle/Creator/CreatorWorkMapping Entityの実装を試みた結果、
コード量が大幅に増加し、実装を見送ることになりました。
この経験から得られた教訓を記録し、今後の開発に活かす必要があります。

## 実装履歴

### 2025年1月: Circle/Creator/CreatorWorkMapping Entity実装の試み

#### 背景
- Video Entityの実装が成功していたため、他のドメインモデルにも展開を検討
- CircleとCreatorは基本的なドメインオブジェクトとして重要と判断

#### 実装内容
1. **Circle Entity** (429行)
   - CircleId値オブジェクト
   - CircleName値オブジェクト  
   - ビジネスメソッド: isNewCircle(), isActive()

2. **Creator Entity** (526行)
   - CreatorId値オブジェクト
   - CreatorName値オブジェクト
   - CreatorRoles値オブジェクト
   - ビジネスメソッド: hasRole(), isVoiceActor()

3. **CreatorWorkMapping Entity** (510行)
   - MappingId複合値オブジェクト
   - CreatorRolesInWork値オブジェクト
   - ビジネスメソッド: isRecentMapping()

#### 結果
- **コード量**: 3,588行追加 vs 144行削減（約25倍の増加）
- **テスト**: 1,271行のテストコード追加
- **影響範囲**: 5ファイルの本番コード修正

#### 判断
**実装を見送り、mainブランチへのマージを中止**

### 学習事項

#### 1. ドメインの複雑性評価の重要性

**失敗パターン**:
```typescript
// 過度に抽象化されたEntity
export class CreatorEntity extends BaseEntity {
  constructor(
    private readonly _id: CreatorId,
    private readonly _name: CreatorName,
    private readonly _roles: CreatorRoles,
    // ... 多くのボイラープレート
  ) {}
  
  // 単純すぎるビジネスロジック
  hasRole(role: CreatorRole): boolean {
    return this._roles.hasRole(role);
  }
}
```

**適切なパターン**:
```typescript
// シンプルな型定義で十分
export interface CreatorPageInfo {
  id: string;
  name: string;
  types: string[];
  workCount: number;
}

// 必要に応じてユーティリティ関数
export const hasRole = (creator: CreatorPageInfo, role: string) => 
  creator.types.includes(role);
```

#### 2. Entity実装のコスト構造

| コンポーネント | 行数 | 必要性 |
|------------|-----|-------|
| 値オブジェクト | 100-150行/個 | IDの検証には有用 |
| Entityクラス | 300-500行 | 複雑なビジネスロジックがある場合のみ |
| Factory/変換 | 100-200行 | Firestoreとの変換は必須 |
| テスト | 400-500行 | 完全なカバレッジには必要 |
| **合計** | **1,000-1,500行** | - |

#### 3. Video Entity成功の理由

Video Entityが成功した理由の分析:

1. **複雑な状態管理**
   - draft → published → archived の状態遷移
   - 公開予約機能
   - 統計情報の更新

2. **外部システムとの統合**
   - YouTubeメタデータ
   - 再生回数の同期
   - タグの正規化

3. **ビジネスルールの存在**
   - タイトルの文字数制限
   - タグの個数制限
   - 公開条件のチェック

これらの要素がCircle/Creatorドメインには欠けていた。

#### 4. 段階的アプローチの重要性

**推奨プロセス**:
1. 最小限のValue Objectから開始
2. ビジネスロジックが増えたらユーティリティ関数
3. 複雑性が閾値を超えたらEntity化

```typescript
// Step 1: Value Object only
export class WorkId {
  constructor(private readonly value: string) {
    if (!value.match(/^RJ\d+$/)) {
      throw new Error("Invalid work ID");
    }
  }
}

// Step 2: Utility functions
export const workUtils = {
  isNewRelease: (date: Date) => { /* ... */ },
  calculateDiscount: (price: number, rate: number) => { /* ... */ }
};

// Step 3: Full Entity (必要になったら)
export class WorkEntity {
  // 複雑なビジネスロジックが必要になった時点で実装
}
```

## 今後の方針

### 1. Entity化の判断プロセス

```mermaid
graph TD
    A[新しいドメインモデル] --> B{ビジネスルール<br/>5個以上？}
    B -->|Yes| C{状態遷移<br/>あり？}
    B -->|No| D[型定義 + Utils]
    C -->|Yes| E[Entity実装検討]
    C -->|No| F{不変条件<br/>複雑？}
    F -->|Yes| E
    F -->|No| D
    E --> G[POC実装]
    G --> H{ROI<br/>ポジティブ？}
    H -->|Yes| I[本実装]
    H -->|No| D
```

### 2. 既存Entityの評価

- **Video Entity**: 6ヶ月後に再評価（2025年7月）
  - バグ率の変化
  - 開発速度への影響
  - チームの習熟度

### 3. 新規Entity候補の優先順位

優先度高:
- DlsiteWork（価格履歴、キャンペーン管理）
- User（認証、権限、プリファレンス）

優先度低:
- DlsiteMetadata（単純なデータ保存）
- YoutubeMetadata（外部API依存）

## 決定

以下の教訓を今後のEntity実装に適用する：

1. **ドメインの複雑性を正確に評価**してからEntity化を検討する
2. **段階的アプローチ**を採用し、最小限から始める
3. **ROI計算**を必ず行い、コストが利益を上回る場合は実装しない
4. **既存コードが安定**している場合は変更しない

## 理由

- Circle/Creatorドメインは想定より単純だった（CRUD操作のみ）
- Entity実装のオーバーヘッドが大きすぎた（約1,200-1,300行/Entity）
- 既存の型定義で十分機能していた

## 結果

**良い点:**
- 過度な抽象化を避けることができた
- 貴重な学習経験を得た
- 明確な判断基準を確立できた

**悪い点:**
- 実装に費やした時間（ただし学習としては有益）

## 参考

- [ADR-001: DDD実装ガイドライン](ADR-001-ddd-implementation-guidelines.md)
- [PR #133: feat: implement Circle, Creator, and CreatorWorkMapping entities](https://github.com/nothink-jp/suzumina.click/pull/133) (マージ見送り)

## 2025年8月19日追記: 関数型パターンへの移行試みと断念

### 背景
Entity/PlainObjectパターンから関数型プログラミングパターンへの完全移行を試行。

### 実装内容
- WorkDataインターフェース作成（WorkPlainObjectの代替）
- Firestore transformerの実装
- 関数型パターンによるアクション実装

### 問題点
1. **データフィールドの不足** - WorkDataに`genres`、`customGenres`、`salesStatus`等が欠落
2. **移行リスクの高さ** - 本番稼働中のシステムでの大規模変更
3. **ROIの低さ** - 労力に見合う価値が得られない

### 決定
- 関数型パターンへの移行を断念
- 現行のEntity/PlainObjectパターンを維持
- 本番環境の安定性を最優先

### 教訓
1. **本番システムでの大規模パラダイム変更は避ける**
2. **段階的移行が困難な場合は現状維持が賢明**
3. **技術的理想より実用性を重視**

- [PR #227: refactor: Entity パターンから関数型プログラミングパターンへの移行](https://github.com/nothink-jp/suzumina.click/pull/227) (クローズ)