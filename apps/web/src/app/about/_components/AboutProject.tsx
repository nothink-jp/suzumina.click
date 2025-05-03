/**
 * プロジェクト概要を表示するコンポーネント
 * サイトの目的や特徴について説明します
 */
export default function AboutProject() {
  const features = [
    {
      title: "最新情報の提供",
      description:
        "涼花みなせさんの活動に関する最新情報をタイムリーに提供します。",
      icon: "📢",
    },
    {
      title: "活動アーカイブ",
      description:
        "過去の活動内容や出演情報をまとめて閲覧できるアーカイブを提供します。",
      icon: "📚",
    },
    {
      title: "コミュニティ支援",
      description:
        "ファン同士の交流や情報共有をサポートし、コミュニティの活性化を目指します。",
      icon: "👥",
    },
    {
      title: "オープンソース",
      description:
        "サイトのコードはオープンソースで、誰でも開発に参加できます。",
      icon: "💻",
    },
  ];

  return (
    <section id="about-project" className="py-12">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold mb-6">プロジェクトについて</h2>
        <p className="max-w-3xl mx-auto">
          「すずみなくりっく！」は2025年に始まったファンプロジェクトです。
          涼花みなせさんのファンが集まり、ファンコミュニティのためのリソースとして作られました。
          当サイトは非公式であり、涼花みなせさん本人や所属事務所とは一切関係ありません。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-12">
        {features.map((feature) => (
          <div key={feature.title} className="card bg-base-100 shadow-xl">
            <div className="card-body items-center text-center">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="card-title">{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-base-200 p-6 rounded-box my-8">
        <h3 className="font-semibold text-xl mb-4">サイトポリシー</h3>
        <ul className="list-disc list-inside space-y-2">
          <li>正確な情報提供に努め、不確かな情報は明記します</li>
          <li>涼花みなせさんのプライバシーを尊重し、公開情報のみを扱います</li>
          <li>著作権を尊重し、権利者の許可なく著作物を掲載しません</li>
          <li>ファン同士の敬意ある交流を大切にします</li>
          <li>サイトの運営・改善に関するご意見を歓迎します</li>
        </ul>
      </div>
    </section>
  );
}
