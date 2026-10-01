# 監視とアラート（ポインタ）

アラートポリシー・閾値・ログベースメトリクスの**正本は terraform**。閾値はここに転記しない
（転記すると必ず drift する）。各ファイルの近接コメントに「その閾値・窓にした理由（実測）」がある。

| ファイル | 対象 |
| --- | --- |
| [monitoring.tf](../../terraform/monitoring.tf) | 通知チャンネル / web（Cloud Run `suzumina-click-web`）の 5xx 率・インスタンス数急増 |
| [monitoring_performance.tf](../../terraform/monitoring_performance.tf) | web の P95 レイテンシ・CPU・メモリ（Firestore レイテンシは metric 未提供でコメントアウト） |
| [monitoring_dlsite.tf](../../terraform/monitoring_dlsite.tf) | `fetchDLsiteUnifiedData`: 系統エラー / 作品 ID 収集失敗 / プラットフォーム 5xx / バッチ全滅 / run 不在 / API 失敗率 / スキーマドリフト |
| [monitoring_youtube.tf](../../terraform/monitoring_youtube.tf) | `fetchYouTubeVideos`: 系統エラー / run 不在 / プラットフォーム 5xx / discovery 未保存 / クォータ不足 / メモリ圧迫 |
| [monitoring_firestore_reads.tf](../../terraform/monitoring_firestore_reads.tf) | Firestore read レート（予算ペースから逆算した警告・緊急） |
| [monitoring_firestore_index.tf](../../terraform/monitoring_firestore_index.tf) | 複合インデックス欠落（`requires an index` ログ・SPR-213） |
| [logging.tf](../../terraform/logging.tf) | アプリログの GCS シンク（保持はバケットの lifecycle が正本） |

- **通知先はメールのみ**（`google_monitoring_notification_channel.email`、宛先は `var.admin_email`＝CI では secret `ADMIN_EMAIL`）。
- **ログベースメトリクス**は各 `monitoring_*.tf` 内の `google_logging_metric` に同居している（別ファイルに集約していない）。
- `checkDataIntegrity` 専用の監視は無い。
- 外形監視（Uptime check）は無い。web の死活はデプロイ時の `/api/health` 検査（[deploy-web.yml](../../.github/workflows/deploy-web.yml)）と上の 5xx 率で見る。

## ログを引くときの落とし穴

Functions は Gen2（Cloud Run 上で実行）なので、ログは `resource.type="cloud_run_revision"` +
`resource.labels.service_name="fetchdlsiteunifieddata"`（**小文字**）で出る。Gen1 形式の
`resource.type="cloud_function"` でフィルタすると一切マッチせず、メトリクスは発火しない（SPR-234）。
付加フィールド無しの logger 呼び出しは `message` が `textPayload` に昇格するため、フィルタは
`jsonPayload.message` / `textPayload` の両張りにする。

## 判断の背景（コードから復元しにくいもの）

- **予算アラートは「使い切ってから」しか鳴らない**。SPR-311 では月額予算 ¥3,000 を Firestore read 単独で使い切り、
  検知できたのは予算 100% 到達メール（月の 18 日目）だった。read 量そのものを見るアラートが無かったのが問題で、
  `monitoring_firestore_reads.tf` がそれを塞ぐ（実データでは予算メールより 3 日早く発火）。予算本体は GCP Billing 側で、terraform 管理外。
- **DLsite のタイムアウトは延ばさず、バッチ側を直す（SPR-318）**。関数 timeout は 540s（deploy-functions.yml が正本）、
  アプリは [process-batch.ts](../../apps/functions/src/endpoints/dlsite/process-batch.ts) の `MAX_EXECUTION_TIME`（480s・run 起動時点基準）で打ち切る。
  上限を超えた後もコンテナの JS は走り続けるが、リクエスト外＝CPU が絞られ、平常 0.1〜0.4 秒で返る Individual Info API が
  15 秒タイムアウトを連発する（失敗率アラートの実発火要因だった）。超過が続くなら timeout ではなくバッチサイズ・並列度を見直す。
