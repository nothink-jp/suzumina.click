import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="bg-suzuka-800 text-suzuka-100 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4">
        <div className="space-y-8">
          {/* サポート情報を横一列に */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <Link
              href="/about"
              className="text-suzuka-300 hover:text-suzuka-100 transition-colors text-sm py-2 rounded-md hover:bg-suzuka-700 focus:bg-suzuka-700 focus:outline-none focus:ring-2 focus:ring-suzuka-500"
            >
              このサイトについて
            </Link>
            <Link
              href="/contact"
              className="text-suzuka-300 hover:text-suzuka-100 transition-colors text-sm py-2 rounded-md hover:bg-suzuka-700 focus:bg-suzuka-700 focus:outline-none focus:ring-2 focus:ring-suzuka-500"
            >
              お問い合わせ
            </Link>
            <Link
              href="/terms"
              className="text-suzuka-300 hover:text-suzuka-100 transition-colors text-sm py-2 rounded-md hover:bg-suzuka-700 focus:bg-suzuka-700 focus:outline-none focus:ring-2 focus:ring-suzuka-500"
            >
              利用規約
            </Link>
            <Link
              href="/privacy"
              className="text-suzuka-300 hover:text-suzuka-100 transition-colors text-sm py-2 rounded-md hover:bg-suzuka-700 focus:bg-suzuka-700 focus:outline-none focus:ring-2 focus:ring-suzuka-500"
            >
              プライバシーポリシー
            </Link>
          </div>

          {/* 下段：サイト名と説明文 */}
          <div className="text-center space-y-4">
            <div>
              <h4 className="font-bold text-lg mb-2">suzumina.click</h4>
              <p className="text-suzuka-300 text-sm">
                ファンによる、ファンのためのコミュニティサイト
              </p>
            </div>
            <div className="border-t border-suzuka-700 pt-4 text-sm text-suzuka-300">
              <p>
                &copy; 2024 涼花みなせ ファンサイト.
                このサイトは非公式のファンサイトです。
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
