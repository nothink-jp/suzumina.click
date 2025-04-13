import Image from "next/image"; // Image は一旦未使用になるが、将来使う可能性があるので残す

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      {/* フォントは layout.tsx の body から継承される想定 */}
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          涼花みなせ 非公式ファンサイト (仮)
        </h1>
        <p className="text-lg">
          ようこそ！ここは涼花みなせさんの活動を応援する非公式ファンサイトです。
        </p>
        <p className="mt-8">
          (コンテンツ準備中...)
        </p>
        {/* DaisyUI ボタンの例 (動作確認用) */}
        <div className="mt-12">
          <button className="btn btn-primary mr-2">Primary Button</button>
          <button className="btn btn-secondary">Secondary Button</button>
        </div>
      </div>
    </main>
  );
}
