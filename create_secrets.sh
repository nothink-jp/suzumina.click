#!/usr/bin/env bash

# シークレット管理スクリプト
# 既存のシークレットを検出して作成をスキップし、値の設定に特化しています

# 必要なシークレットの一覧
SECRETS=(
  "NEXT_PUBLIC_DISCORD_CLIENT_ID"
  "NEXT_PUBLIC_DISCORD_REDIRECT_URI"
  "DISCORD_CLIENT_SECRET"
  "DISCORD_TARGET_GUILD_ID"
  "FIREBASE_SERVICE_ACCOUNT_KEY"
  "YOUTUBE_API_KEY"
)

# プロジェクトIDを設定
PROJECT_ID="suzumina-click-firebase"

# 各シークレットの状態を確認し、必要な値を設定
for SECRET_NAME in "${SECRETS[@]}"; do
  # シークレットが存在するかチェック
  if gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" &>/dev/null; then
    echo "シークレット「$SECRET_NAME」は既に存在します。最新バージョンを確認します..."
    
    # シークレットの最新バージョンが存在するか確認
    if ! gcloud secrets versions list "$SECRET_NAME" --project="$PROJECT_ID" --format="value(name)" | grep -q "1" &>/dev/null; then
      echo "シークレット「$SECRET_NAME」には値が設定されていません。値を設定します..."
    else
      echo "シークレット「$SECRET_NAME」には既に値が設定されています。"
      echo "値を更新する場合は「y」を入力してください（更新しない場合はその他のキーを押してください）:"
      read -r UPDATE_VALUE
      if [[ "$UPDATE_VALUE" != "y" ]]; then
        echo "シークレット「$SECRET_NAME」の値を更新せずにスキップします。"
        continue
      fi
      echo "シークレット「$SECRET_NAME」の値を更新します..."
    fi
  else
    echo "シークレット「$SECRET_NAME」が存在しないため作成します..."
    gcloud secrets create "$SECRET_NAME" --project="$PROJECT_ID"
    echo "シークレット「$SECRET_NAME」を作成しました。値を設定します..."
  fi
  
  # JSONシークレットかどうかを確認
  if [[ "$SECRET_NAME" == "FIREBASE_SERVICE_ACCOUNT_KEY" ]]; then
    echo "「$SECRET_NAME」はJSON形式のシークレットです。JSONファイルのパスを入力してください:"
    read -r JSON_FILE_PATH
    if [[ -f "$JSON_FILE_PATH" ]]; then
      gcloud secrets versions add "$SECRET_NAME" --data-file="$JSON_FILE_PATH" --project="$PROJECT_ID"
      echo "シークレット「$SECRET_NAME」にJSONファイルの内容を設定しました。"
    else
      echo "指定されたファイルが見つかりません。シークレット「$SECRET_NAME」の設定をスキップします。"
    fi
  else
    # 通常のテキストシークレット
    echo "シークレット「$SECRET_NAME」の値を入力してください（入力は表示されません）:"
    read -rs SECRET_VALUE
    echo -n "$SECRET_VALUE" | gcloud secrets versions add "$SECRET_NAME" --data-file=- --project="$PROJECT_ID"
    echo "シークレット「$SECRET_NAME」に値を設定しました。"
  fi
done

# すべてのシークレットの状態を確認
echo "シークレットの設定状況を確認します..."
for SECRET_NAME in "${SECRETS[@]}"; do
  echo "-------------------------------------"
  echo "シークレット「$SECRET_NAME」の状態確認:"
  gcloud secrets versions list "$SECRET_NAME" --project="$PROJECT_ID"
done

echo "-------------------------------------"
echo "すべてのシークレット設定処理が完了しました。"
