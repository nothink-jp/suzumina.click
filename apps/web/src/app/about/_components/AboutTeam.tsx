/**
 * チーム紹介セクションを表示するコンポーネント
 * プロジェクト運営メンバーについて紹介します
 */
export default function AboutTeam() {
  // 架空のチームメンバー情報
  const teamMembers = [
    {
      name: "田中 開発",
      role: "代表 / エンジニア",
      description: "プロジェクト発起人。Webアプリケーション開発を担当。",
      avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=dev1",
    },
    {
      name: "佐藤 デザイン",
      role: "UI/UXデザイナー",
      description: "サイトのデザイン全般とユーザー体験の向上を担当。",
      avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=design1",
    },
    {
      name: "鈴木 編集",
      role: "コンテンツ編集",
      description: "サイト内の記事執筆や情報のキュレーションを担当。",
      avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=content1",
    },
  ];

  return (
    <section id="team" className="py-12">
      <h2 className="text-3xl font-bold text-center mb-10">
        プロジェクトチーム
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {teamMembers.map((member) => (
          <div key={member.name} className="card bg-base-100 shadow-xl">
            <figure className="px-10 pt-10">
              {/* アバター画像 - DiceBearの生成画像を使用 */}
              <img
                src={member.avatar}
                alt={`${member.name}のアバター`}
                className="rounded-xl w-32 h-32"
              />
            </figure>
            <div className="card-body items-center text-center">
              <h3 className="card-title">{member.name}</h3>
              <div className="badge badge-primary">{member.role}</div>
              <p className="mt-2">{member.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-12">
        <div className="card bg-base-100 shadow-lg max-w-2xl mx-auto">
          <div className="card-body">
            <h3 className="card-title justify-center">
              プロジェクトに参加しませんか？
            </h3>
            <p className="mb-4">
              「すずみなくりっく！」はオープンプロジェクトです。
              デザイン、開発、コンテンツ作成など、様々な形で貢献できます。
              興味のある方はぜひご連絡ください！
            </p>
            <div className="card-actions justify-center">
              <button type="button" className="btn btn-primary">
                お問い合わせ
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
