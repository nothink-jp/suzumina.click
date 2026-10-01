# ドキュメント索引

能動ルールの正本は [CLAUDE.md](../CLAUDE.md)。ここに並ぶのは「必要になったときだけ読む」背景資料で、
コードと食い違ったらコード（と CLAUDE.md）が正しい。バージョンは各 `package.json`、タスクは Linear（SPR-*）、
変更履歴は git log が正本。

## 判断の記録

- [ADR 索引](decisions/README.md) — 設計判断と現在の状態

## ドメイン・データ

- [domain-model](reference/domain-model.md) — 各概念の正本（型・変換関数）の在処
- [database-schema](reference/database-schema.md) — Firestore コレクション台帳
- [ubiquitous-language](reference/ubiquitous-language.md) — 用語集（`works` 改名の経緯を含む）
- [entity-implementation-guide](reference/entity-implementation-guide.md) — ドメインを関数型で追加する手順
- [application-architecture](reference/application-architecture.md) — アプリ層の構成・エラー方針
- [external-apis/dlsite-api](reference/external-apis/dlsite-api.md) — DLsite Individual Info API の解析記録

## 開発・運用

- [development](guides/development.md) — 開発環境・worktree・規約
- [testing](guides/testing.md) — テスト戦略・スモーク
- [deployment](guides/deployment.md) — リリース手順・緊急対応
- [monitoring](operations/monitoring.md) — 監視・アラート
- [changelog](operations/changelog.md) — v0.3.13 までの変更履歴（凍結）
- インフラ: [terraform/README](../terraform/README.md) — 運用 runbook とファイル索引
