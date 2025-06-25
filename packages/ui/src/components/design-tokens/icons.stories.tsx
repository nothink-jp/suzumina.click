import type { Meta, StoryObj } from "@storybook/react";
import {
	AlertCircle,
	ArrowLeft,
	ArrowRight,
	Calendar,
	Check,
	ChevronDown,
	ChevronLeft,
	// ナビゲーション系
	ChevronRight,
	ChevronUp,
	Clock,
	ExternalLink,
	Eye,
	FileText,
	GripVertical,
	Hash,
	Heart,
	// UI/UX系
	Loader2,
	LogOut,
	Menu,
	MoreHorizontal,
	Pause,
	// アクション系
	Play,
	PlayCircle,
	Plus,
	Search,
	Share2,
	// 商業・作品系
	ShoppingCart,
	Sparkles,
	Star,
	// コンテンツ系
	Tag,
	Terminal,
	TrendingUp,
	// ユーザー・コミュニティ系
	User,
	Users,
	Video,
	X,
	Youtube,
} from "lucide-react";

const meta: Meta = {
	title: "Design Tokens/Icons",
	parameters: {
		docs: {
			description: {
				component: "suzumina.clickのアイコンシステム - Lucide Reactベースの一貫したアイコン使用",
			},
		},
	},
};

export default meta;
type Story = StoryObj;

// アイコンサイズの定義
const iconSizes = [
	{ name: "3x3", class: "h-3 w-3", size: "12px", usage: "統計情報、タグ内、小さなインライン表示" },
	{ name: "4x4", class: "h-4 w-4", size: "16px", usage: "標準ボタン、一般的なUI要素" },
	{ name: "5x5", class: "h-5 w-5", size: "20px", usage: "検索バー、中サイズUI要素" },
	{ name: "6x6", class: "h-6 w-6", size: "24px", usage: "大きなボタン、ヘッダー要素" },
	{ name: "8x8", class: "h-8 w-8", size: "32px", usage: "強調表示、エラー状態" },
	{ name: "12x12", class: "h-12 w-12", size: "48px", usage: "空状態、大きな表示エリア" },
];

// ナビゲーション系アイコン
const navigationIcons = [
	{ icon: ChevronRight, name: "ChevronRight", usage: "ページネーション、メニュー展開" },
	{ icon: ChevronLeft, name: "ChevronLeft", usage: "戻る、前のページ" },
	{ icon: ChevronDown, name: "ChevronDown", usage: "ドロップダウン、展開" },
	{ icon: ChevronUp, name: "ChevronUp", usage: "折りたたみ、上に移動" },
	{ icon: ArrowLeft, name: "ArrowLeft", usage: "ナビゲーション戻る" },
	{ icon: ArrowRight, name: "ArrowRight", usage: "ナビゲーション進む" },
	{ icon: Menu, name: "Menu", usage: "ハンバーガーメニュー" },
	{ icon: ExternalLink, name: "ExternalLink", usage: "外部リンク（YouTube、DLsite）" },
	{ icon: MoreHorizontal, name: "MoreHorizontal", usage: "その他のオプション" },
];

// アクション系アイコン
const actionIcons = [
	{ icon: Play, name: "Play", usage: "音声・動画再生" },
	{ icon: Pause, name: "Pause", usage: "再生停止" },
	{ icon: Plus, name: "Plus", usage: "新規作成、追加" },
	{ icon: Search, name: "Search", usage: "検索機能" },
	{ icon: Share2, name: "Share2", usage: "SNS共有" },
	{ icon: Heart, name: "Heart", usage: "いいね、お気に入り" },
	{ icon: Eye, name: "Eye", usage: "表示回数、閲覧" },
	{ icon: X, name: "X", usage: "閉じる、削除" },
];

// ステータス・情報系アイコン
const statusIcons = [
	{ icon: Tag, name: "Tag", usage: "タグ、カテゴリ" },
	{ icon: Clock, name: "Clock", usage: "時間、再生時間" },
	{ icon: Calendar, name: "Calendar", usage: "日付、公開日" },
	{ icon: Star, name: "Star", usage: "評価、レーティング" },
	{ icon: Loader2, name: "Loader2", usage: "ローディング状態" },
	{ icon: Check, name: "Check", usage: "完了、選択状態" },
	{ icon: AlertCircle, name: "AlertCircle", usage: "警告、エラー" },
	{ icon: TrendingUp, name: "TrendingUp", usage: "人気、ランキング" },
];

// メディア系アイコン
const mediaIcons = [
	{ icon: PlayCircle, name: "PlayCircle", usage: "動画プレビュー" },
	{ icon: Video, name: "Video", usage: "動画コンテンツ" },
	{ icon: Youtube, name: "Youtube", usage: "YouTube連携" },
	{ icon: FileText, name: "FileText", usage: "テキストコンテンツ" },
	{ icon: Sparkles, name: "Sparkles", usage: "特別コンテンツ" },
];

// ユーザー系アイコン
const userIcons = [
	{ icon: User, name: "User", usage: "ユーザープロフィール" },
	{ icon: Users, name: "Users", usage: "ユーザー管理" },
	{ icon: LogOut, name: "LogOut", usage: "ログアウト" },
];

// アイコングリッドコンポーネント
const IconGrid = ({ icons, title }: { icons: any[]; title: string }) => (
	<div className="mb-8">
		<h3 className="text-lg font-semibold mb-4">{title}</h3>
		<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
			{icons.map(({ icon: Icon, name, usage }) => (
				<div key={name} className="border border-gray-200 rounded-lg p-4 text-center">
					<Icon className="h-6 w-6 mx-auto mb-2 text-gray-700" />
					<div className="font-medium text-sm">{name}</div>
					<code className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono">{name}</code>
					<div className="text-xs text-gray-600 mt-1">{usage}</div>
				</div>
			))}
		</div>
	</div>
);

// サイズデモコンポーネント
const SizeDemo = ({
	name,
	className,
	size,
	usage,
}: {
	name: string;
	className: string;
	size: string;
	usage: string;
}) => (
	<div className="border border-gray-200 rounded-lg p-4 text-center">
		<Play className={`${className} mx-auto mb-2 text-suzuka-500`} />
		<div className="font-medium text-sm">{name}</div>
		<div className="text-xs text-gray-600">{size}</div>
		<code className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono block mt-1">
			{className}
		</code>
		<div className="text-xs text-gray-600 mt-1">{usage}</div>
	</div>
);

export const IconSizes: Story = {
	render: () => (
		<div className="p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Icon Sizes</h1>
				<p className="text-gray-600">suzumina.clickで使用されるアイコンサイズの標準規格</p>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
				{iconSizes.map((size) => (
					<SizeDemo key={size.name} {...size} />
				))}
			</div>

			<div className="mt-12 p-6 bg-gray-50 rounded-lg">
				<h2 className="text-lg font-semibold mb-4">サイズ使用ガイドライン</h2>
				<ul className="space-y-2 text-sm text-gray-700">
					<li>
						• <strong>h-3 w-3 (12px):</strong> 統計情報、タグ内の小さなアイコン
					</li>
					<li>
						• <strong>h-4 w-4 (16px):</strong> 標準的なボタン内アイコン（最頻出）
					</li>
					<li>
						• <strong>h-5 w-5 (20px):</strong> 検索バー、中サイズのUI要素
					</li>
					<li>
						• <strong>h-6 w-6 (24px):</strong> 大きなボタン、ヘッダー要素
					</li>
					<li>
						• <strong>h-8 w-8 (32px):</strong> 強調表示、エラー状態表示
					</li>
					<li>
						• <strong>h-12 w-12 (48px):</strong> 空状態、大きな表示エリア
					</li>
				</ul>
			</div>
		</div>
	),
};

export const IconCategories: Story = {
	render: () => (
		<div className="p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Icon Categories</h1>
				<p className="text-gray-600">用途別に分類されたアイコンライブラリ</p>
			</div>

			<IconGrid icons={navigationIcons} title="ナビゲーション系" />
			<IconGrid icons={actionIcons} title="アクション系" />
			<IconGrid icons={statusIcons} title="ステータス・情報系" />
			<IconGrid icons={mediaIcons} title="メディア系" />
			<IconGrid icons={userIcons} title="ユーザー系" />
		</div>
	),
};

export const IconInContext: Story = {
	render: () => (
		<div className="p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Icons in Context</h1>
				<p className="text-gray-600">実際のUI要素でのアイコン使用例</p>
			</div>

			<div className="space-y-8">
				{/* ボタン例 */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">Buttons</h3>
					<div className="flex flex-wrap gap-4">
						<button className="flex items-center px-4 py-2 bg-suzuka-500 text-white rounded text-sm">
							<Play className="h-4 w-4 mr-2" />
							再生
						</button>
						<button className="flex items-center px-4 py-2 bg-gray-500 text-white rounded text-sm">
							<Pause className="h-4 w-4 mr-2" />
							停止
						</button>
						<button className="flex items-center px-4 py-2 bg-blue-500 text-white rounded text-sm">
							<Plus className="h-4 w-4 mr-2" />
							作成
						</button>
						<button className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded text-sm">
							<Share2 className="h-4 w-4 mr-2" />
							共有
						</button>
						<button className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded text-sm">
							<ExternalLink className="h-4 w-4 mr-2" />
							外部リンク
						</button>
					</div>
				</div>

				{/* 統計表示例 */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">Statistics Display</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						<div className="bg-gray-50 p-4 rounded">
							<div className="flex items-center text-sm text-gray-600 space-x-4">
								<span className="flex items-center">
									<Play className="h-3 w-3 mr-1" />
									1,234 再生
								</span>
								<span className="flex items-center">
									<Heart className="h-3 w-3 mr-1" />
									89 いいね
								</span>
								<span className="flex items-center">
									<Eye className="h-3 w-3 mr-1" />
									567 表示
								</span>
							</div>
						</div>
						<div className="bg-gray-50 p-4 rounded">
							<div className="flex items-center text-sm text-gray-600 space-x-2">
								<Clock className="h-3 w-3" />
								<span>2:34</span>
								<Calendar className="h-3 w-3" />
								<span>2024/12/25</span>
							</div>
						</div>
						<div className="bg-gray-50 p-4 rounded">
							<div className="flex items-center text-sm text-gray-600 space-x-2">
								<Tag className="h-3 w-3" />
								<span>挨拶</span>
								<Star className="h-3 w-3" />
								<span>4.8</span>
							</div>
						</div>
					</div>
				</div>

				{/* ナビゲーション例 */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">Navigation</h3>
					<div className="space-y-4">
						{/* ページネーション */}
						<div className="flex items-center justify-center space-x-2">
							<button className="p-2 border border-gray-300 rounded">
								<ChevronLeft className="h-4 w-4" />
							</button>
							<span className="px-3 py-1 bg-suzuka-500 text-white rounded">1</span>
							<span className="px-3 py-1 text-gray-700">2</span>
							<span className="px-3 py-1 text-gray-700">3</span>
							<button className="p-2 border border-gray-300 rounded">
								<MoreHorizontal className="h-4 w-4" />
							</button>
							<button className="p-2 border border-gray-300 rounded">
								<ChevronRight className="h-4 w-4" />
							</button>
						</div>

						{/* ブレッドクラム */}
						<div className="flex items-center space-x-2 text-sm">
							<span className="text-gray-500">ホーム</span>
							<ChevronRight className="h-3 w-3 text-gray-400" />
							<span className="text-gray-500">音声ボタン</span>
							<ChevronRight className="h-3 w-3 text-gray-400" />
							<span className="text-gray-900">詳細</span>
						</div>

						{/* ドロップダウン */}
						<div className="relative inline-block">
							<button className="flex items-center px-4 py-2 border border-gray-300 rounded">
								<span className="mr-2">並び順</span>
								<ChevronDown className="h-4 w-4" />
							</button>
						</div>
					</div>
				</div>

				{/* 検索・フィルター例 */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">Search & Filters</h3>
					<div className="space-y-4">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
							<input
								type="text"
								placeholder="音声ボタンを検索..."
								className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
							/>
						</div>
						<div className="flex space-x-2">
							<span className="flex items-center px-3 py-1 bg-suzuka-100 text-suzuka-800 rounded-full text-sm">
								<Tag className="h-3 w-3 mr-1" />
								挨拶
								<X className="h-3 w-3 ml-1 cursor-pointer" />
							</span>
							<span className="flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
								<Calendar className="h-3 w-3 mr-1" />
								2024年
								<X className="h-3 w-3 ml-1 cursor-pointer" />
							</span>
						</div>
					</div>
				</div>

				{/* ローディング・状態表示 */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">Loading & Status</h3>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="text-center p-4 bg-gray-50 rounded">
							<Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-500" />
							<p className="text-sm text-gray-600">読み込み中...</p>
						</div>
						<div className="text-center p-4 bg-green-50 rounded">
							<Check className="h-6 w-6 mx-auto mb-2 text-green-500" />
							<p className="text-sm text-green-700">完了しました</p>
						</div>
						<div className="text-center p-4 bg-red-50 rounded">
							<AlertCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
							<p className="text-sm text-red-700">エラーが発生</p>
						</div>
					</div>
				</div>

				{/* 空状態表示 */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">Empty States</h3>
					<div className="text-center py-12">
						<Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-400" />
						<h4 className="text-lg font-medium text-gray-900 mb-2">
							音声ボタンが見つかりませんでした
						</h4>
						<p className="text-gray-600 mb-6">
							検索条件を変更するか、新しい音声ボタンを作成してみましょう
						</p>
						<button className="flex items-center mx-auto px-4 py-2 bg-suzuka-500 text-white rounded">
							<Plus className="h-4 w-4 mr-2" />
							音声ボタンを作成
						</button>
					</div>
				</div>
			</div>
		</div>
	),
};

export const IconBestPractices: Story = {
	render: () => (
		<div className="p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Icon Best Practices</h1>
				<p className="text-gray-600">アイコン使用における推奨事項とアクセシビリティ配慮</p>
			</div>

			<div className="space-y-8">
				{/* 良い例・悪い例 */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{/* 良い例 */}
					<div className="border border-green-200 rounded-lg p-6 bg-green-50">
						<h3 className="text-lg font-semibold mb-4 text-green-800">✅ 良い例</h3>
						<div className="space-y-4">
							<div className="bg-white p-3 rounded border">
								<button className="flex items-center px-4 py-2 bg-suzuka-500 text-white rounded">
									<Play className="h-4 w-4 mr-2" />
									再生
								</button>
								<p className="text-xs text-green-700 mt-2">
									適切なサイズ、間隔、テキストとの組み合わせ
								</p>
							</div>
							<div className="bg-white p-3 rounded border">
								<div className="flex items-center text-sm text-gray-600">
									<Eye className="h-3 w-3 mr-1" />
									1,234 表示回数
								</div>
								<p className="text-xs text-green-700 mt-2">統計情報に適した小サイズアイコン</p>
							</div>
							<div className="bg-white p-3 rounded border">
								<div className="text-center py-6">
									<Sparkles className="h-12 w-12 mx-auto mb-2 text-gray-400" />
									<p className="text-gray-600">コンテンツがありません</p>
								</div>
								<p className="text-xs text-green-700 mt-2">空状態での大サイズアイコン使用</p>
							</div>
						</div>
					</div>

					{/* 悪い例 */}
					<div className="border border-red-200 rounded-lg p-6 bg-red-50">
						<h3 className="text-lg font-semibold mb-4 text-red-800">❌ 悪い例</h3>
						<div className="space-y-4">
							<div className="bg-white p-3 rounded border">
								<button className="flex items-center px-4 py-2 bg-suzuka-500 text-white rounded">
									<Play className="h-8 w-8 mr-1" />
									再生
								</button>
								<p className="text-xs text-red-700 mt-2">サイズが大きすぎ、間隔が不適切</p>
							</div>
							<div className="bg-white p-3 rounded border">
								<div className="flex items-center text-sm text-gray-600">
									<Eye className="h-6 w-6 mr-1" />
									1,234
								</div>
								<p className="text-xs text-red-700 mt-2">統計情報にサイズが大きすぎるアイコン</p>
							</div>
							<div className="bg-white p-3 rounded border">
								<div className="text-center py-6">
									<Sparkles className="h-3 w-3 mx-auto mb-2 text-gray-400" />
									<p className="text-gray-600">コンテンツがありません</p>
								</div>
								<p className="text-xs text-red-700 mt-2">空状態でのアイコンが小さすぎる</p>
							</div>
						</div>
					</div>
				</div>

				{/* アクセシビリティ */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">アクセシビリティ配慮</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<h4 className="font-medium mb-3">推奨実装パターン</h4>
							<pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
								{`// 装飾的アイコン
<Play className="h-4 w-4" aria-hidden="true" />

// 意味のあるアイコン
<Search 
  className="h-4 w-4" 
  aria-label="検索" 
/>

// ボタン内アイコン
<button aria-label="動画を再生">
  <Play className="h-4 w-4" />
</button>`}
							</pre>
						</div>
						<div>
							<h4 className="font-medium mb-3">アクセシビリティガイドライン</h4>
							<ul className="space-y-2 text-sm text-gray-600">
								<li>
									• <strong>aria-hidden:</strong> 装飾的アイコンには必須
								</li>
								<li>
									• <strong>aria-label:</strong> 単体で意味を持つアイコン
								</li>
								<li>
									• <strong>色だけに依存しない:</strong> 形状でも情報を伝達
								</li>
								<li>
									• <strong>十分なコントラスト:</strong> WCAG基準準拠
								</li>
								<li>
									• <strong>タッチターゲット:</strong> 最小44px×44px
								</li>
							</ul>
						</div>
					</div>
				</div>

				{/* パフォーマンス */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">パフォーマンス最適化</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<h4 className="font-medium mb-3">推奨インポート方法</h4>
							<pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
								{`// 推奨: 個別インポート
import { Play, Pause } from "lucide-react";

// 非推奨: 全体インポート
import * as Icons from "lucide-react";`}
							</pre>
						</div>
						<div>
							<h4 className="font-medium mb-3">最適化のポイント</h4>
							<ul className="space-y-2 text-sm text-gray-600">
								<li>
									• <strong>個別インポート:</strong> バンドルサイズ削減
								</li>
								<li>
									• <strong>アイコン統一:</strong> 同機能には同アイコン
								</li>
								<li>
									• <strong>SVG最適化:</strong> Lucide Reactが自動対応
								</li>
								<li>
									• <strong>キャッシュ活用:</strong> 同じアイコンの再利用
								</li>
							</ul>
						</div>
					</div>
				</div>

				{/* 一貫性ガイドライン */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">一貫性ガイドライン</h3>
					<div className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<h4 className="font-medium mb-2">機能別アイコン</h4>
								<ul className="text-sm text-gray-600 space-y-1">
									<li>• 再生: Play</li>
									<li>• 停止: Pause</li>
									<li>• 検索: Search</li>
									<li>• 追加: Plus</li>
									<li>• 削除: X</li>
								</ul>
							</div>
							<div>
								<h4 className="font-medium mb-2">標準サイズ</h4>
								<ul className="text-sm text-gray-600 space-y-1">
									<li>• 統計: h-3 w-3</li>
									<li>• ボタン: h-4 w-4</li>
									<li>• 検索: h-5 w-5</li>
									<li>• エラー: h-8 w-8</li>
									<li>• 空状態: h-12 w-12</li>
								</ul>
							</div>
							<div>
								<h4 className="font-medium mb-2">標準マージン</h4>
								<ul className="text-sm text-gray-600 space-y-1">
									<li>• ボタン内: mr-2</li>
									<li>• 統計情報: mr-1</li>
									<li>• リスト項目: mr-3</li>
									<li>• 中央配置: mx-auto</li>
								</ul>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	),
};
