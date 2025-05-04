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
            
            // 音声クリップコレクション
            match /audioClips/{clipId} {
              // 公開クリップは誰でも読み取り可能、非公開は作成者のみ読み取り可能
              allow read: if resource.data.isPublic == true || 
                           (isAuthenticated() && resource.data.userId == request.auth.uid);
              
              // 作成は認証済みユーザーのみ可能、更新と削除は作成者のみ可能
              allow create: if isAuthenticated() && 
                             request.resource.data.userId == request.auth.uid;
              allow update, delete: if isOwner(resource.data.userId);
            }
            
            // ユーザーコレクション
            match /users/{userId} {
              // ユーザー自身のみが自分のデータを読み書き可能
              allow read, write: if isOwner(userId);
              
              // お気に入りサブコレクション
              match /favorites/{clipId} {
                // お気に入りの読み書きはユーザー自身のみ可能
                allow read, write: if isOwner(userId);
              }
            }
          }
        }
      EOT
    }
  })
}