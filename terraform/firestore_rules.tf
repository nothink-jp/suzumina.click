/**
 * Firestore セキュリティルール定義
 * 
 * このファイルはFirestoreのセキュリティルールをTerraformで管理します。
 * 適切なアクセス制御を行い、データの整合性と安全性を確保します。
 */

resource "google_firestore_document" "firestore_rules" {
  project     = var.gcp_project_id
  collection  = "_firestore_rules"
  document_id = "firestore_rules"
  fields      = jsonencode({
    rules = {
      string_value = <<-EOT
        rules_version = '2';
        service cloud.firestore {
          // 基本設定 - デフォルトはすべての読み書きを拒否
          match /databases/{database}/documents {
            // ユーザー認証関数
            function isAuthenticated() {
              return request.auth != null;
            }
            
            // リクエスト元のユーザーとリソース所有者が一致するか確認
            function isOwner(userId) {
              return isAuthenticated() && request.auth.uid == userId;
            }
            
            // 動画コレクション
            match /videos/{videoId} {
              // 誰でも読み取り可能、書き込みは管理者のみ
              allow read;
              allow write: if false; // 管理者APIのみ書き込み可能
            }
            
            // DLsite作品コレクション
            match /dlsiteWorks/{workId} {
              // 誰でも読み取り可能、書き込みは管理者のみ
              allow read;
              allow write: if false; // 管理者APIのみ書き込み可能
            }
            
            // 音声ボタンコレクション（統一システム）
            match /audioButtons/{buttonId} {
              // 公開音声ボタンは誰でも読み取り可能、非公開は作成者のみ読み取り可能
              allow read: if resource.data.isPublic == true || 
                           (isAuthenticated() && resource.data.createdBy == request.auth.uid);
              
              // データ検証関数（Discord ID対応）
              function isValidAudioButton() {
                return request.resource.data.keys().hasAll(['title', 'startTime', 'endTime', 'sourceVideoId', 'isPublic', 'createdBy', 'createdByName', 'createdAt']) &&
                       request.resource.data.title is string &&
                       request.resource.data.title.size() > 0 &&
                       request.resource.data.title.size() <= 100 &&
                       request.resource.data.startTime is number &&
                       request.resource.data.endTime is number &&
                       request.resource.data.startTime >= 0 &&
                       request.resource.data.endTime > request.resource.data.startTime &&
                       request.resource.data.sourceVideoId is string &&
                       request.resource.data.sourceVideoId.size() > 0 &&
                       request.resource.data.isPublic is bool &&
                       request.resource.data.createdBy is string &&
                       request.resource.data.createdByName is string &&
                       request.resource.data.createdAt is string;
              }
              
              // 作成・更新・削除はServer Actionsのみで操作
              allow create, update, delete: if false; // Server Actionsのみで操作
            }
            
            // ユーザーコレクション（Discord ID ベース）
            match /users/{discordId} {
              // 公開プロフィールは誰でも読み取り可能、プライベートは所有者のみ
              allow read: if resource.data.isPublicProfile == true || 
                           (isAuthenticated() && request.auth.token.discord_id == discordId);
              
              // ユーザーデータ検証関数
              function isValidUserData() {
                return request.resource.data.keys().hasAll(['discordId', 'username', 'displayName', 'role', 'isActive', 'createdAt']) &&
                       request.resource.data.discordId is string &&
                       request.resource.data.username is string &&
                       request.resource.data.displayName is string &&
                       request.resource.data.role in ['member', 'moderator', 'admin'] &&
                       request.resource.data.isActive is bool &&
                       request.resource.data.createdAt is string;
              }
              
              // 作成・更新はServer Actionsのみ
              allow create, update: if false; // Server Actionsのみで操作
              
              // 削除は管理者のみ
              allow delete: if false; // 管理者APIのみ
            }
          }
        }
      EOT
    }
  })
}