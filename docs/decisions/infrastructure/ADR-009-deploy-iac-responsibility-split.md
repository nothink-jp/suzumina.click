# ADR-009: GitHub Actions Deploy と Terraform IaC の役割分担（SPR-91）

## ステータス

**承認済み** (2026-06-01) — SPR-91（drift 棚卸し）の整合方針の決定。実装は Phase 別 sub-issue（SPR-92/95/96/97/98/99）に委譲。

## コンテキスト

本プロジェクトのインフラは Terraform（IaC）と GitHub Actions（CI/CD）の2系統で GCP リソースを操作している。この構成は2025年に整えられたが、当時から運用形態が変わり、現在は Claude Code による複数 worktree の並列開発（[ADR-008](../architecture/ADR-008-git-worktree-friendly-monorepo.md)）が前提になっている。

SPR-91 の drift 棚卸しと deploy workflow 監査で、両系統が**同じリソースの同じフィールドを宣言的に書く二重管理**が複数判明した：

- `fetchYouTubeVideos` の timeout/max_instances を `deploy-functions.yml:201-202` が `--timeout 540s --max-instances 3` で焼く一方、terraform は 120s/1 を宣言（`service_config` は ignore 対象外）→ 恒久 drift（live 540/3 ↔ config 120/1）。terraform を 120/1 に戻しても次デプロイで 540/3 に戻る **ping-pong**。
- Cloud Run web の spec（cpu/mem/instances/timeout/port）を `deploy-web.yml` と `cloud_run.tf` の両方が同値で持つ「二箇所で一致させた二重管理」＝同期負債。
- Artifact Registry image / GCS デプロイ zip の GC が terraform ネイティブ GC（`cleanup_policies`/`lifecycle_rule`）と workflow 手動 delete で多重管理。

二重管理は、(1) 片方だけ変更すると不整合、(2) 並列開発で複数エージェント/worktree が別経路で同じ設定を変える事故、(3)「どちらが正本か」の曖昧さ（読み手の予測が外れる）を生む。場当たり修正では再び冗長が生まれるため、**役割分担の原則を先に定める**。

## 決定

### 原則1: 1リソース・1属性・1正本

同一リソースの同一フィールドを Terraform と GitHub Actions の両方が宣言的に書かない。属性単位で正本を一方に定める。

### 原則2: 責務境界は「ソースコードのデプロイ方式が spec と不可分か」で分ける

- **Cloud Functions → GitHub Actions が spec の正本**
  zip ソースと spec が `gcloud functions deploy` で一体に焼かれ、terraform は `build_config` を保持できない（毎デプロイで Actions が上書きする）。かつ spec が単純（timeout/memory/instances）。
  → terraform は関数本体リソース（`google_cloudfunctions2_function`）を**持たない**。SA / Pub/Sub / Scheduler / IAM の土台のみ管理する（既存の `checkDataIntegrity` 方式に全関数を統一）。
- **Cloud Run → Terraform が spec の正本**
  image が Artifact Registry に分離され、spec は service 定義として独立。image は terraform の data source で live 追従でき（SPR-67）、env/secret は `ignore_changes` で Actions に委譲済み。かつ spec が豊富（cpu/mem/instances/timeout/port/concurrency/probe/cpu-boost/traffic）で宣言的管理の価値が高い。
  → terraform（`cloud_run.tf`）が spec と invoker の正本。GitHub Actions は image build/push と env/secret 投入のみ（`gcloud run deploy` から spec フラグを渡さない＝patch で既存 spec を保持）。
- **土台（IAM / Secret / Pub/Sub / Scheduler / Firestore / バケット・リポジトリ定義 / ネットワーク）→ Terraform が正本**

### 原則3: GC（内容物のライフサイクル）は Terraform ネイティブに一本化

Artifact Registry image と GCS デプロイ zip の GC は terraform の `cleanup_policies` / `lifecycle_rule` を正本とし、workflow の手動 delete を廃止する。Cloud Run revisions は terraform 管理外のため workflow に残すが、重複ロジックは共通化する。

### 原則4: 並列開発（複数 worktree / エージェント）耐性

- Terraform state は単一（GCS backend `suzumina-click-tfstate` / production workspace）。apply は state lock で直列化され、並列 apply は自動的にブロックされる。
- 「1属性1正本」により、ある設定を変えるとき編集すべき箇所が一意化し、複数経路からの同時変更事故を構造的に防ぐ。
- GitHub Actions デプロイは main push トリガー + concurrency 制御で直列。

### 運用: 2-Phase で移行

- **Phase 1（原則の適用）**: 二重管理を解消する（Functions を Actions 専管化 / Cloud Run の spec フラグを workflow から削除 / GC を terraform 一本化）。terraform apply は当面これまで通り**手動 `-target` apply**（SPR-91 の慎重方針を維持）。
- **Phase 2（apply の自動化）**: terraform plan を PR で自動表示し、main merge 後に GitHub environment の承認ゲートで apply する（plan自動 / apply承認制）。terraform apply 用の強権限 SA + WIF + 承認ゲートを整備する。

### 開発体験への影響: コードデプロイは不変

日常の web / functions のコード変更は、これまで通り **PR を approve（merge）すれば GitHub Actions が自動デプロイ**する。`gcloud run deploy --image` / `gcloud functions deploy` は毎デプロイ実行され、デプロイの頻度・自動性・速度は変わらない。Terraform を触るのは **spec を変更する稀なケースのみ**。

### 緊急変更の escape hatch

spec の緊急変更（負荷急増時の max-instances 引き上げ等）は、`gcloud` / console で直接変更してよい。ただし速やかに terraform に同値を反映し、drift を恒久放置しない。

## 理由

- Functions と Cloud Run で正本を分ける非対称には一貫した基準（**ソースと spec の不可分性** + spec の複雑さ）がある。Functions は zip と spec が一体で spec が単純 → Actions が自然。Cloud Run は image 分離で spec が豊富 → 宣言的 IaC が自然。
- 二重管理（特に youtube の ping-pong drift）は、`ignore_changes` の網羅性を人が保証し続ける脆い仕組みに依存していた。属性単位で正本を一意化すれば、この保守負債が消える。
- Claude Code 並列開発では「どこを直せば live が変わるか」が一意であることが事故防止に直結する（ステートレスな協働相手に対する相互情報量の最大化）。
- apply の CI 化（Phase 2）は強権限 SA を CI に置くセキュリティコストを伴うため、原則適用（Phase 1）と分離して段階導入する。Phase 1 だけでも「1属性1正本」は達成され、並列開発の事故は構造的に激減する。

## 結果

### 良い点
- 二重管理が原理的に解消され、youtube の恒久 drift（SPR-92）が消える。
- `ignore_changes` の網羅依存から脱却する。
- 「1属性1正本」で並列開発の事故が構造的に減る。
- 各 drift 解消 issue（SPR-92/95/96/97/98）の方針が一意に定まる。

### トレードオフ
- Functions の spec が IaC の宣言から消える（locals/コメントのドキュメントとして残す）。DR 時は workflow 再実行が前提。
- Cloud Run の spec 変更が terraform 経由（Phase 1 は手動 apply）になり、コードデプロイとは別経路になる。ただし spec 変更は稀。
- Phase 2 の CI 化には強権限 SA とセキュリティ設計のコストがかかる。

### 各 issue への帰結
| issue | 内容 | Phase |
| --- | --- | --- |
| SPR-92 | 関数本体リソースを terraform から除去（Actions 専管化）→ drift 消滅 | 1 |
| SPR-95 | runtime の dead locals 削除（Actions 正本） | 1 |
| SPR-96 | GC を terraform ネイティブに一本化 | 1 |
| SPR-97 | Cloud Run spec を terraform 専管化 + invoker 専管（workflow から spec フラグ / `--allow-unauthenticated` 削除） | 1 |
| SPR-98 | cosmetic drift 解消（firestore_rules / dashboard / warmup UA） | 1 |
| SPR-99 | terraform plan自動 / apply承認制 CI | 2 |
| SPR-94 | Google Cloud DNS dead-zone の廃止判断（本 ADR とは独立） | 別枠 |

## 代替案

1. **Cloud Run も Actions 専管**（spec を `gcloud run deploy` のフラグで管理）→ Cloud Run の spec は豊富（concurrency/probe/cpu-boost 等）で gcloud フラグ管理は漏れやすく、terraform の service 宣言が `ignore_changes` だらけで形骸化する。plan自動/apply承認制の恩恵が spec に及ばない → **不採用**。
2. **`ignore_changes` を網羅して二重管理を温存**（youtube timeout/max を ignore に追加するだけ）→「宣言しているのに無視」が増え宣言が形骸化、網羅性を人が保証し続ける負債が残り根治にならない → **不採用**。
3. **Functions も Terraform 専管**（`build_config` を terraform 管理）→ `gcloud functions deploy` が毎回 source/spec を上書きし競合、zip ソースを terraform が安定して持てない → **不採用**。
4. **現状維持（二重管理）** → ping-pong drift と並列開発の事故が継続 → **不採用**。

## 関連リンク

- SPR-91（drift 棚卸しと整合方針の決定 / 親）、SPR-92 / SPR-94 / SPR-95 / SPR-96 / SPR-97 / SPR-98 / SPR-99
- [ADR-008](../architecture/ADR-008-git-worktree-friendly-monorepo.md)（Claude Code worktree 並列開発の基盤）
- PR #466（Cloud Run cpu 表記整合 + client/client_version を ignore）、PR #467（SPF を cloudflare_record 化）
- SPR-67（Cloud Run image を data source で live 追従）

---
最終更新: 2026-06-01
作成日: 2026-06-01
作成者: Claude (Opus 4.8)
関連 SPR: SPR-91, SPR-92, SPR-94, SPR-95, SPR-96, SPR-97, SPR-98, SPR-99
