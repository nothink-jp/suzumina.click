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
            
            // 音声ボタンコレクション（Phase 1では非推奨、audioReferencesを使用）
            match /audioButtons/{buttonId} {
              // 公開音声ボタンは誰でも読み取り可能、非公開は作成者のみ読み取り可能
              allow read: if resource.data.isPublic == true || 
                           (isAuthenticated() && resource.data.uploadedBy == request.auth.uid);
              
              // 作成は認証済みユーザーのみ可能（Phase 2で実装予定）
              allow create: if false; // 現在はServer Actionsのみで作成
              
              // 更新と削除は作成者のみ可能（Phase 2で実装予定）
              allow update, delete: if false; // 現在はServer Actionsのみで操作
            }
            
            // 音声リファレンスコレクション（新しい実装）
            match /audioReferences/{referenceId} {
              // 公開音声リファレンスは誰でも読み取り可能、非公開は作成者のみ読み取り可能
              allow read: if resource.data.isPublic == true || 
                           (isAuthenticated() && resource.data.createdBy == request.auth.uid);
              
              // データ検証関数
              function isValidAudioReference() {
                return request.resource.data.keys().hasAll(['title', 'startTime', 'endTime', 'videoId', 'isPublic', 'createdBy', 'createdAt']) &&
                       request.resource.data.title is string &&
                       request.resource.data.title.size() > 0 &&
                       request.resource.data.title.size() <= 100 &&
                       request.resource.data.startTime is number &&
                       request.resource.data.endTime is number &&
                       request.resource.data.startTime >= 0 &&
                       request.resource.data.endTime > request.resource.data.startTime &&
                       request.resource.data.videoId is string &&
                       request.resource.data.videoId.size() > 0 &&
                       request.resource.data.isPublic is bool &&
                       request.resource.data.createdBy is string &&
                       request.resource.data.createdAt is timestamp;
              }
              
              // 作成は認証済みユーザーのみ可能
              allow create: if isAuthenticated() && 
                               request.resource.data.createdBy == request.auth.uid &&
                               isValidAudioReference();
              
              // 更新と削除は作成者のみ可能
              allow update: if isOwner(resource.data.createdBy) &&
                               request.resource.data.createdBy == resource.data.createdBy &&
                               isValidAudioReference();
              
              allow delete: if isOwner(resource.data.createdBy);
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