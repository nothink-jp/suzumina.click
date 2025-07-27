# Video Legacy Format Migration Archive

**アーカイブ日**: 2025-07-27  
**理由**: Video entityのレガシーフォーマット削除は完了済み

## 概要

このディレクトリには、Video entityのレガシーフォーマット削除に関連するドキュメントがアーカイブされています。移行は正常に完了し、現在のVideoエンティティはEntity/Value Objectアーキテクチャに基づく新しい実装を使用しています。

## アーカイブされたドキュメント

- `VIDEO_LEGACY_FORMAT_MIGRATION.md` - レガシーフォーマット削除の詳細な移行手順書

## 移行の概要

### 変更内容
- **変更前**: Video entity → toLegacyFormat() → Firestore
- **変更後**: Video entity → toFirestore() → Firestore

### 成果
- videosコレクションの完全移行
- Entity/Value Objectアーキテクチャへの統合
- レガシー変換コードの削除

## 関連ドキュメント

現在のVideo実装については以下を参照：
- `/docs/DOMAIN_MODEL.md` - Videoエンティティの設計
- `/docs/DOMAIN_OBJECT_CATALOG.md` - Video関連の値オブジェクト仕様
- `/docs/ENTITY_IMPLEMENTATION_GUIDELINES.md` - 実装ガイドライン