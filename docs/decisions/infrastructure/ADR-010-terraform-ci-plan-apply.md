# ADR-010: Terraform plan自動 / apply承認制 CI（SPR-99 / ADR-009 Phase 2）

## ステータス

**承認済み** (2026-06-01) — [ADR-009](ADR-009-deploy-iac-responsibility-split.md) の Phase 2（apply の自動化）の具体設計。SPR-99。Phase 1（SPR-92/96/97/98）完了後に着手。

## コンテキスト

ADR-009 で「1リソース・1属性・1正本」を確立し Phase 1 で二重管理を解消した。terraform apply は当面 **手動 `-target` apply**（SPR-91 の慎重方針）で運用してきたが、これは:

- ローカルに ADC + 機密 tfvars が必要で、実行者・環境に依存する。
- plan が PR 上で可視化されず、レビュー（承認者）が変更内容を事前に確認できない。
- 手動操作のため適用漏れ・workspace 取り違え（default で全 create になる事故）等のヒューマンエラー余地がある。

Phase 2 として apply を CI 化し、**plan を PR で自動可視化 / apply を承認ゲート経由**にする。本プロジェクトの基盤（[iam.tf](../../../terraform/iam.tf)）には既に GitHub Actions 用の WIF（`github-pool`/`github-provider`、repo `nothink-jp/suzumina.click` に限定、`attribute.ref` マッピング済み）と GCS backend（`suzumina-click-tfstate` / production workspace）がある。

## 決定

### 全体方針: plan 先行の 2-Stage で段階導入

apply CI は強権限 SA を CI に置くセキュリティコストが主のため、低リスクな plan から先に入れる。

- **Stage 1: plan-on-PR**（本 ADR の最初の実装）
  `terraform/**` を変更する PR で `terraform plan` を自動実行し、結果を job summary / PR に表示する。**読み取り専用 SA**で実行し、書き込み権限も承認ゲートも不要＝低リスクで即日有用。
- **Stage 2: apply-on-approval**
  main merge 後（`terraform/**`）に **GitHub Environment の required reviewer 承認**を挟んで `terraform apply` を実行する。**強権限 SA**を使い、WIF 連携は `main` ブランチからの assume のみに限定。state lock で直列化。

### SA は plan / apply で分離（最小権限）

| SA | 権限 | WIF assume 条件 | 用途 |
| --- | --- | --- | --- |
| `terraform-plan-sa` | `roles/viewer` + tfstate バケット objectViewer（read のみ） | repo 限定（任意ブランチ＝PR 可） | Stage 1 plan |
| `terraform-apply-sa` | **curated strong**（`roles/editor` + `resourcemanager.projectIamAdmin` + `iam.serviceAccountAdmin` + `iam.workloadIdentityPoolAdmin` + `secretmanager.admin` 等、terraform が触る範囲をカバー） | repo 限定 **かつ `attribute.ref == refs/heads/main`** | Stage 2 apply |

- plan は read-only SA + `terraform plan -lock=false`（state ロック不要）で、PR から強権限を一切使わない。
- apply SA は `roles/owner` を避け curated strong とする（漏洩時の探査可能性を下げる）。それでも強権限のため **GitHub Environment `production` の required reviewer** を必須ゲートにする（WIF の main 限定と二重防御）。

### 機密の扱い: secret 値は Terraform 管理外（bootstrap 一回化）

`google_secret_manager_secret_version.secret_versions` は `secret_data = var.*` で 6 つのアプリ機密を管理していたが、**`ignore_changes = [secret_data]` を付与し Terraform 管理から外す**。

- 理由: CI apply 時に `TF_VAR_*` が live と食い違うと secret が**意図せずローテーション**される。ignore_changes により、CI は app 機密に **placeholder 値**を渡せばよく、機密を GitHub に置く必要も誤ローテーションの危険もなくなる。
- secret 値の変更は今後 console / `gcloud secrets versions add` で out-of-band 実施（変更頻度は低い）。secret コンテナ（`google_secret_manager_secret`）と IAM は引き続き Terraform 管理。
- 例外: `cloudflare_api_token`（provider 認証に必須）と `admin_email`（monitoring の通知先）は **実値**が必要なため GitHub Secrets から `TF_VAR_` で注入する。

### 非機密 config の供給

`gcp_project_id` / `project_number` / `artifact_registry_repository_id`（= `suzumina-click-web`）/ `custom_domain`（= `suzumina.click`）/ `domain_name` は非機密。CI workflow から明示的に `-var`（GitHub Variables/Secrets or リテラル）で渡す。`artifact_registry_repository_id` は default `suzumina-click` のままだと repo 名差で forces replacement の偽 plan になるため、CI では必ず実値を渡す。

### production workspace の固定

CI は必ず `terraform workspace select production` を行う（default workspace で plan すると全リソース create の事故になるため）。

## 理由

- plan/apply の SA 分離により、PR（任意ブランチ・第三者 fork の可能性）からは read-only 権限しか使えず、強権限は main + 承認ゲート経由でしか発火しない。
- WIF（短命 OIDC トークン）を使い、長命の SA キーを GitHub に置かない。
- secret を Terraform 管理外にすることで、CI に機密を持たせず・誤ローテーションを防ぐ。Terraform は「secret の器と権限」を、値は out-of-band を正本とする責務分離。
- Atlantis / HCP Terraform を使わず GitHub Actions ネイティブで完結（ソロ開発の運用コスト最小）。

## 結果

### 良い点
- plan が PR で可視化され、承認者が適用前に差分を確認できる。手動 apply のヒューマンエラー（workspace 取り違え等）を構造的に防ぐ。
- 強権限は main + Environment 承認の二重ゲート内のみ。日常の plan は read-only。
- CI から機密が分離され、誤ローテーションリスクが消える。

### トレードオフ
- secret 値が Terraform の宣言から外れる（IaC の網羅性が一部下がる）。値変更は out-of-band 手順になる。
- 強権限 SA の存在自体がセキュリティ資産（WIF 限定 + 承認ゲートで緩和）。
- 既知の cosmetic drift（dashboard×3）は plan に出続けるため、apply 時はレビューで無害と判断して通す（または将来 ignore/解消）。

## 代替案

1. **単一の強権限 SA を plan/apply 共用** → PR plan でも強権限を使うことになり最小権限に反する → **不採用**（plan は read-only SA に分離）。
2. **`roles/owner` を apply SA に付与** → 最も簡単だが漏洩時の影響が最大 → **不採用**（curated strong + 承認ゲート）。
3. **secret を Terraform 管理のまま GitHub Secrets で供給** → CI に全機密を置く必要があり、値ズレ時の誤ローテーション risk → **不採用**（ignore_changes で管理外へ）。
4. **Atlantis / HCP Terraform 導入** → ソロ開発に対し運用・コスト過剰 → **不採用**。
5. **手動 `-target` apply 継続（Phase 1 のまま）** → plan 非可視・ヒューマンエラー余地が残る → **段階導入で解消**。

## 関連リンク

- [ADR-009](ADR-009-deploy-iac-responsibility-split.md)（役割分担 / 2-Phase の親決定）、SPR-99 / 親 SPR-91
- [iam.tf](../../../terraform/iam.tf)（WIF pool/provider・SA 定義）、[backend.tf](../../../terraform/backend.tf)（GCS state）、[secrets.tf](../../../terraform/secrets.tf)（secret 管理）

---
最終更新: 2026-06-01
作成日: 2026-06-01
作成者: Claude (Opus 4.8)
関連 SPR: SPR-99, SPR-91
