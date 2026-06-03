# プロジェクト全体で利用するローカル変数を定義します。

locals {
  # プロジェクトIDを一元管理するための変数
  # var.gcp_project_id を参照し、他のリソース定義で利用します。
  project_id = var.gcp_project_id

  # 環境固有の設定（production 単一環境。staging は実体がなく SPR-100 で廃止）
  environment_config = {
    production = {
      # 本番環境（個人利用レベル・パフォーマンス改善）
      cloud_run_min_instances = 1   # LCP改善: コールドスタート排除
      cloud_run_max_instances = 2   # 最大インスタンス数を制限
      cloud_run_cpu           = "1" # 1vCPU: アイドル後レスポンス遅延を改善（gcloud --cpu 1 の表記に整合）
      # SPR-83: cpu_idle=false は billable_instance_time を約28倍に増やす主因（+~¥8,700/月）。
      # この規模（~0.1 req/s）では min_instances=1 の常時ウォーム + warm-up scheduler の
      # `/` ping（JIT維持）で体感速度は確保でき、24/7フルレート課金は過剰なため true に戻す。
      cloud_run_cpu_idle = true     # アイドル時はCPU課金を停止（min_instances=1 でウォームは維持）
      cloud_run_memory   = "1024Mi" # メモリ増強（1GB）でGC改善
      # functions_* は ADR-009/SPR-92 で Actions 専管化。spec の正本は deploy-functions.yml
      budget_amount        = 5000 # 月額5000円制限
      enable_monitoring    = true # フル監視
      enable_custom_domain = true # 本番ドメイン
    }
  }

  # 現在の環境設定を取得
  current_env = local.environment_config[var.environment]

  # 共通のリソース名プレフィックス
  resource_prefix = "${var.gcp_project_id}-${var.environment}"

  # 共通ラベル
  common_labels = {
    project     = var.gcp_project_id
    environment = var.environment
    managed_by  = "terraform"
    component   = "suzumina-click"
  }
}