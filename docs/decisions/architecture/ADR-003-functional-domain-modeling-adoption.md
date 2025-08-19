# ADR-003: 関数型ドメインモデリングの採用

## ステータス
採用 (2024-08-19)

## コンテキスト
React Server Components (RSC) の導入により、Entity/ValueObjectのクラスインスタンスがサーバー/クライアント境界を越えられない問題が発生した。

## 決定
DDDのEntityパターンから関数型プログラミングパターンへ移行する。

### 新しいアーキテクチャ
- **PlainObject**: シリアライズ可能なデータ構造
- **Actions**: ピュア関数によるビジネスロジック
- **Transformers**: データ変換ロジック

## 影響

### ポジティブ
- RSC境界を問題なく通過可能
- テストが簡単（純粋関数）
- パフォーマンス向上（オブジェクト生成コストの削減）

### ネガティブ
- 既存コードのリファクタリングが必要
- チームメンバーの学習コスト

## 参照
- [関数型ドメインモデリングガイド](../../reference/functional-domain-modeling-guide.md)
- [ADR-002: Entity実装の教訓](./ADR-002-entity-implementation-lessons.md)