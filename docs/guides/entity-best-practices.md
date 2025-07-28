# Entity利用のベストプラクティス

## 概要

このドキュメントでは、suzumina.clickプロジェクトにおけるEntity利用のベストプラクティスを説明します。

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

### Repositoryパターンの活用

Cloud FunctionsではRepositoryパターンを使用してFirestoreアクセスを抽象化します。

```typescript
// repositories/circle-repository.ts
export class CircleRepository {
  constructor(private readonly db: Firestore) {}

  async findById(circleId: string): Promise<CircleEntity | null> {
    if (!isValidCircleId(circleId)) {
      return null;
    }
    
    const doc = await this.db.collection("circles").doc(circleId).get();
    if (!doc.exists) {
      return null;
    }
    
    return CircleEntity.fromFirestoreData({
      ...doc.data(),
      circleId: doc.id,
    });
  }
  
  async save(entity: CircleEntity): Promise<boolean> {
    const data = entity.toFirestore();
    await this.db.collection("circles").doc(entity.circleId).set({
      ...data,
      lastUpdated: FieldValue.serverTimestamp(),
    }, { merge: true });
    return true;
  }
}
```

### サービス層での利用

```typescript
// services/dlsite/collect-circle-creator-info.ts
const circleRepository = new CircleRepository(adminDb);

async function updateCircleInfo(apiData: DLsiteRawApiResponse, isNewWork: boolean) {
  const existingCircle = await circleRepository.findById(apiData.maker_id);
  
  if (!existingCircle) {
    // 新規作成
    const newCircle = CircleEntity.create(
      apiData.maker_id,
      apiData.maker_name,
      undefined,
      1
    );
    await circleRepository.save(newCircle);
  } else {
    // 更新
    let updated = existingCircle;
    if (apiData.maker_name !== existingCircle.circleName) {
      updated = existingCircle.updateName(apiData.maker_name);
    }
    if (isNewWork) {
      updated = updated.incrementWorkCount();
    }
    await circleRepository.save(updated);
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

### Repository層のテスト

Firestoreをモックしてテスト：

```typescript
describe("CircleRepository", () => {
  it("サークルを保存できる", async () => {
    mockSet.mockResolvedValueOnce(undefined);
    const entity = CircleEntity.create("RG12345", "テストサークル");
    const result = await repository.save(entity);
    expect(result).toBe(true);
  });
});
```

## まとめ

1. **Next.js**: Server ComponentsではPlain Objectを使用
2. **Cloud Functions**: Repositoryパターンでデータアクセスを抽象化
3. **共通**: 入力検証、エラーハンドリング、不変性の維持
4. **テスト**: 各層で適切なテストを実装

これらのパターンに従うことで、型安全で保守性の高いコードを実現できます。