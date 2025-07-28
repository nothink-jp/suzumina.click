# Entity利用のベストプラクティス

> **📅 最終更新**: 2025年7月28日  
> **📝 ステータス**: v2.0 - Minimal DDD アプローチの明文化  
> **🎯 目的**: Cloud FunctionsとNext.js 15に最適化されたEntity実装ガイド

## 概要

このドキュメントでは、suzumina.clickプロジェクトにおけるEntity利用のベストプラクティスを説明します。

## 🚨 重要: Minimal DDD アプローチ

**本プロジェクトでは、純粋なオブジェクト指向や厳密なDDDではなく、Cloud FunctionsとNext.js 15に最適化された最小限のDDDを採用しています。**

### 設計原則

1. **薄いオブジェクト構成** - オーバーヘッドを最小限に抑える
2. **直接的なFirestoreアクセス** - Repositoryパターンは使用しない
3. **TypeScriptの型安全性を活用** - 実行時オーバーヘッドを避ける
4. **実用性重視** - 理論的純粋性より実装のシンプルさを優先

### ❌ 使用しないパターン

- **Repository パターン** - 不要な抽象化層を追加しない
- **Unit of Work パターン** - Firestoreのトランザクション機能で十分
- **複雑な集約** - エンティティは単純に保つ
- **過度なカプセル化** - 必要最小限のプライベートプロパティ

## 1. Next.js App Router (Server Actions)

### CirclePlainObject型の利用

Server ComponentsからClient Componentsへデータを渡す際は、必ずPlain Objectに変換します。

```typescript
// ❌ 悪い例：Entityを直接返す
export async function getCircleInfo(circleId: string): Promise<CircleEntity | null> {
  // ...
  return CircleEntity.fromFirestoreData(data);
}

// ✅ 良い例：Plain Objectを返す
export async function getCircleInfo(circleId: string): Promise<CirclePlainObject | null> {
  // ...
  const entity = CircleEntity.fromFirestoreData(data);
  return entity.toPlainObject();
}
```

### Client Componentでの利用

```typescript
// ✅ 良い例：Plain Objectを受け取る
interface CirclePageClientProps {
  circle: CirclePlainObject;
  initialData: WorkPlainObject[];
}

export function CirclePageClient({ circle, initialData }: CirclePageClientProps) {
  return (
    <div>
      <h1>{circle.name}</h1>
      <p>作品数: {circle.workCount}件</p>
    </div>
  );
}
```

## 2. Cloud Functions

### 直接的なFirestoreアクセス

Cloud FunctionsではEntityを使用しつつ、直接Firestoreにアクセスします。Repositoryパターンは使用しません。

```typescript
// services/dlsite/collect-circle-creator-info.ts
async function updateCircleInfo(
  batch: FirebaseFirestore.WriteBatch,
  apiData: DLsiteRawApiResponse,
  isNewWork: boolean
): Promise<void> {
  const circleId = apiData.maker_id;
  if (!circleId || !isValidCircleId(circleId)) return;

  // 直接Firestoreから取得
  const circleRef = adminDb.collection("circles").doc(circleId);
  const circleDoc = await circleRef.get();

  if (!circleDoc.exists) {
    // 新規作成 - Entityを使用してドメインロジックを適用
    const newCircle = CircleEntity.create(
      circleId,
      apiData.maker_name || "",
      undefined,
      1
    );

    const circleData = newCircle.toFirestore();
    batch.set(circleRef, {
      ...circleData,
      lastUpdated: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });
  } else {
    // 既存更新 - Entityで変更を管理
    const existingData = circleDoc.data() as CircleData;
    const existingCircle = CircleEntity.fromFirestoreData({
      ...existingData,
      circleId: circleDoc.id,
    });

    let updatedCircle = existingCircle;
    
    if (apiData.maker_name !== existingCircle.circleName) {
      updatedCircle = existingCircle.updateName(apiData.maker_name);
    }
    if (isNewWork) {
      updatedCircle = updatedCircle.incrementWorkCount();
    }

    if (updatedCircle !== existingCircle) {
      batch.update(circleRef, {
        name: updatedCircle.circleName,
        workCount: updatedCircle.workCountNumber,
        lastUpdated: FieldValue.serverTimestamp(),
      });
    }
  }
}
```

### Work Entityの利用例

```typescript
// services/domain/work-classification-service.ts
static determineMainCategory(work: WorkDocument): string {
  try {
    // WorkDocumentから直接Entityを作成
    const workEntity = Work.fromFirestoreData(work);
    if (!workEntity) {
      return WorkClassificationService.determineMainCategoryFromFormat(work.workFormat);
    }
    
    // Entityのメソッドを使用してビジネスロジックを実行
    return workEntity.determineCategory();
  } catch (error) {
    logger.warn("Failed to create Work entity", error);
    return "その他";
  }
}
```

## 3. 共通原則

### 入力検証

常にEntityを作成する前に入力検証を行います：

```typescript
if (!isValidCircleId(circleId)) {
  logger.warn(`Invalid circle ID: ${circleId}`);
  return null;
}
```

### エラーハンドリング

Entityの作成や変換で例外が発生する可能性があるため、適切にハンドリングします：

```typescript
try {
  const entity = CircleEntity.fromFirestoreData(data);
  return entity.toPlainObject();
} catch (error) {
  logger.error("Failed to create entity", error);
  return null;
}
```

### 不変性の維持

Entityは不変オブジェクトとして設計されています。更新時は新しいインスタンスを作成します：

```typescript
// ❌ 悪い例：直接変更しようとする
entity.workCount = 10; // エラー！

// ✅ 良い例：新しいインスタンスを作成
const updated = entity.updateWorkCount(10);
```

### バッチ処理での考慮

Cloud Functionsでバッチ処理を行う場合は、Firestoreの制限を考慮します：

```typescript
// 10個ずつのバッチで処理（in演算子の制限）
for (let i = 0; i < circleIds.length; i += 10) {
  const batch = circleIds.slice(i, i + 10);
  const entities = await repository.findByIds(batch);
  // 処理...
}
```

## 4. テスト戦略

### Entity自体のテスト

Entity自体の振る舞いをユニットテストで検証：

```typescript
describe("CircleEntity", () => {
  it("作品数を増加できる", () => {
    const entity = CircleEntity.create("RG12345", "テストサークル");
    const updated = entity.incrementWorkCount();
    expect(updated.workCountNumber).toBe(1);
  });
});
```

### サービス層のテスト

Firestoreをモックしてサービス層をテスト：

```typescript
describe("updateCircleInfo", () => {
  it("新規サークルを作成できる", async () => {
    mockGet.mockResolvedValueOnce({ exists: false });
    
    const batch = { set: jest.fn() };
    await updateCircleInfo(batch, mockApiData, true);
    
    expect(batch.set).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        circleId: "RG12345",
        name: "テストサークル",
        workCount: 1,
      })
    );
  });
});
```

## まとめ

### Minimal DDD の実装指針

1. **Next.js**: Server ComponentsではPlain Objectを使用
2. **Cloud Functions**: 直接Firestoreアクセス（Repositoryパターンは使用しない）
3. **Entity**: ドメインロジックとバリデーションのみに集中
4. **共通**: 入力検証、エラーハンドリング、不変性の維持
5. **テスト**: サービス層とEntity自体のテストに集中

### 既存Entityの参考実装

- **Work Entity**: `packages/shared-types/src/entities/work.ts`
- **Video Entity**: `packages/shared-types/src/entities/video.ts`
- **AudioButton Entity**: `packages/shared-types/src/entities/audio-button.ts`

これらの既存実装を参考に、シンプルで実用的なEntityを実装してください。

### 実装時の注意点

- 過度な抽象化を避ける
- Firestoreの機能を最大限活用する
- TypeScriptの型システムで安全性を担保する
- 実行時のパフォーマンスを常に意識する

このアプローチにより、Cloud FunctionsとNext.js 15の特性に最適化された、メンテナンス性の高いコードベースを維持できます。