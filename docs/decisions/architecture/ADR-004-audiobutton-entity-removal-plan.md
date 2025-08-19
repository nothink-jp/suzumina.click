# ADR-004: AudioButton Entity完全削除計画

## ステータス
提案中 (2025-08-19)

## コンテキスト

AudioButton Entityの段階的移行が進行中：
- 互換レイヤー（AudioButtonCompat）実装済み
- Server Actions移行済み
- Componentsは互換レイヤー使用中
- テストが22件失敗（Entity直接使用）

## 決定

AudioButton Entityを完全に削除し、PlainObject + 純粋関数パターンに統一する。

## 実施計画

### Phase 1: テスト修正（即時）
- [ ] テストをPlainObject使用に変更
- [ ] AudioButtonCompatのテスト追加
- [ ] すべてのテストをパス

### Phase 2: Entity削除（Phase 1完了後）
- [ ] AudioButton Entityクラス削除
- [ ] 関連Value Object削除
  - AudioContent
  - AudioReference
  - ButtonStatistics
- [ ] fromFirestoreData静的メソッド削除

### Phase 3: クリーンアップ（Phase 2完了後）
- [ ] 未使用インポート削除
- [ ] ドキュメント更新
- [ ] パフォーマンス測定

## 結果

- コードベース簡素化（約2,000行削減見込み）
- ビルド時間短縮
- 保守性向上

## リスク

- テスト修正に時間がかかる可能性
- 一時的な機能停止リスク（ロールバック計画必要）
