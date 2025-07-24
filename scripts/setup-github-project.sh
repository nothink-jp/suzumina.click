#!/bin/bash

# Entity/Value Object拡張計画のGitHub Project設定スクリプト

PROJECT_NUMBER=1
OWNER="nothink-jp"
REPO="suzumina.click"

echo "🚀 Entity/Value Object拡張計画のPRアイテムを追加中..."

# Phase 1: 基盤整備
echo "📦 Phase 1: 基盤整備"

# PR #1は既に作成済み（#96）なのでスキップ

# PR #2
gh project item-create $PROJECT_NUMBER --owner $OWNER --title "PR #2: Value Object基盤クラスの導入" --body "Value Object共通インターフェース、equals(), clone()等の共通メソッド実装"

# Phase 2: Video Entity実装
echo "📹 Phase 2: Video Entity実装"

# PR #3-7
gh project item-create $PROJECT_NUMBER --owner $OWNER --title "PR #3: Video Value Objects (Part 1)" --body "VideoMetadata, Channel Value Objectの実装"
gh project item-create $PROJECT_NUMBER --owner $OWNER --title "PR #4: Video Value Objects (Part 2)" --body "VideoStatistics, VideoContent Value Objectの実装"
gh project item-create $PROJECT_NUMBER --owner $OWNER --title "PR #5: Video Entity定義" --body "Video Entityクラスとファクトリメソッドの実装"
gh project item-create $PROJECT_NUMBER --owner $OWNER --title "PR #6: Video Repository実装" --body "FirestoreへのVideo Entity永続化層の実装"
gh project item-create $PROJECT_NUMBER --owner $OWNER --title "PR #7: Video Service層実装" --body "Video関連のビジネスロジック移行"

# Phase 3: AudioButton Entity実装
echo "🎵 Phase 3: AudioButton Entity実装"

# PR #8-11
gh project item-create $PROJECT_NUMBER --owner $OWNER --title "PR #8: AudioButton Value Objects" --body "ButtonMetadata, Timestamp, VideoReference Value Objectの実装"
gh project item-create $PROJECT_NUMBER --owner $OWNER --title "PR #9: AudioButton Entity定義" --body "AudioButton Entityクラスとファクトリメソッドの実装"
gh project item-create $PROJECT_NUMBER --owner $OWNER --title "PR #10: AudioButton Repository実装" --body "FirestoreへのAudioButton Entity永続化層の実装"
gh project item-create $PROJECT_NUMBER --owner $OWNER --title "PR #11: AudioButton Service層実装" --body "AudioButton関連のビジネスロジック移行"

# Phase 4: フロントエンド統合
echo "🎨 Phase 4: フロントエンド統合"

# PR #12-15
gh project item-create $PROJECT_NUMBER --owner $OWNER --title "PR #12: VideoページのEntity対応" --body "VideoページコンポーネントをVideo Entity使用に移行"
gh project item-create $PROJECT_NUMBER --owner $OWNER --title "PR #13: AudioButtonコンポーネントのEntity対応" --body "AudioButtonコンポーネントをAudioButton Entity使用に移行"
gh project item-create $PROJECT_NUMBER --owner $OWNER --title "PR #14: 検索機能のEntity対応" --body "検索機能をEntity/Value Object使用に移行"
gh project item-create $PROJECT_NUMBER --owner $OWNER --title "PR #15: 管理画面のEntity対応" --body "管理画面をEntity/Value Object使用に移行"

# Phase 5: バックエンド統合
echo "🔧 Phase 5: バックエンド統合"

# PR #16-18
gh project item-create $PROJECT_NUMBER --owner $OWNER --title "PR #16: Cloud FunctionsのEntity対応" --body "Cloud FunctionsをEntity/Value Object使用に移行"
gh project item-create $PROJECT_NUMBER --owner $OWNER --title "PR #17: データ収集システムのEntity対応" --body "YouTube/DLsiteデータ収集をEntity/Value Object使用に移行"
gh project item-create $PROJECT_NUMBER --owner $OWNER --title "PR #18: バッチ処理のEntity対応" --body "バッチ処理をEntity/Value Object使用に移行"

# Phase 6: 最終移行
echo "🏁 Phase 6: 最終移行"

# PR #19-21
gh project item-create $PROJECT_NUMBER --owner $OWNER --title "PR #19: レガシー型定義の削除" --body "古い型定義の削除と最終クリーンアップ"
gh project item-create $PROJECT_NUMBER --owner $OWNER --title "PR #20: ドキュメント最終更新" --body "すべてのドキュメントをEntity/Value Object対応に更新"
gh project item-create $PROJECT_NUMBER --owner $OWNER --title "PR #21: パフォーマンス最適化と最終調整" --body "パフォーマンステストと最終的な最適化"

echo "✅ すべてのPRアイテムを追加しました！"
echo "🔗 プロジェクトURL: https://github.com/orgs/$OWNER/projects/$PROJECT_NUMBER"