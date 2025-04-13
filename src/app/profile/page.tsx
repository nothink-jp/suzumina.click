// src/app/profile/page.tsx

export default function ProfilePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">プロフィール</h1>
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">涼花みなせ (Suzuka Minase)</h2>
          <p>
            ここにプロフィール情報を記述します。
            YouTubeチャンネルやSNSへのリンクなどを掲載予定です。
          </p>
          <p className="mt-4">(コンテンツ準備中...)</p>
          {/* 将来的に画像などを追加 */}
          {/* <figure><img src="/path/to/image.jpg" alt="Profile image" /></figure> */}
          <div className="card-actions justify-end mt-4">
            {/* 将来的に関連リンクボタンなどを追加 */}
            {/* <button className="btn btn-primary">YouTube</button> */}
          </div>
        </div>
      </div>
    </div>
  );
}
