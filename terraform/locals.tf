# プロジェクト全体で利用するローカル変数を定義します。

locals {
  # プロジェクトIDを一元管理するための変数
  # var.gcp_project_id を参照し、他のリソース定義で利用します。
  project_id = var.gcp_project_id
  
  # 環境固有の設定（個人開発向け2環境構成）
  environment_config = {
    staging = {
      # テスト・プレビュー環境（超軽量・コスト重視）
      cloud_run_min_instances = 0
      cloud_run_max_instances = 1     # 最小限（テスト用）
      cloud_run_cpu          = "1000m"
      cloud_run_memory       = "512Mi" # 最小メモリ
      functions_memory        = "256Mi" # 最小メモリ
      functions_timeout       = 120    # 短いタイムアウト
      functions_enabled       = false  # staging環境ではfunctions無効化（コスト削減）
      budget_amount          = 1000   # 約1000円（月）
      enable_monitoring      = false  # 基本監視のみ
      enable_custom_domain   = false  # staging用ドメイン不要
    }
    production = {
      # 本番環境（個人利用レベル・安定性重視）
      cloud_run_min_instances = 1     # コールドスタート回避・レイテンシ改善
      cloud_run_max_instances = 3     # トラフィック急増対応
      cloud_run_cpu          = "2000m" # Next.js SSR+Tailwind CSS v4最適化
      cloud_run_memory       = "2Gi"   # Node.jsヒープ+同時接続対応
      functions_memory        = "512Mi" 
      functions_timeout       = 300
      functions_enabled       = true   # 本番では有効
      budget_amount          = 4000   # 約4000円（月）
      enable_monitoring      = true   # フル監視
      enable_custom_domain   = true   # 本番ドメイン
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