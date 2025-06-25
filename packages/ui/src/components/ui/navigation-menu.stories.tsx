import type { Meta, StoryObj } from "@storybook/react";
import { PlayCircle, Video, Music, Users, Settings, ExternalLink } from "lucide-react";
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
} from "./navigation-menu";

const meta: Meta<typeof NavigationMenu> = {
	title: "UI/Navigation Menu",
	component: NavigationMenu,
	parameters: {
		docs: {
			description: {
				component:
					"ナビゲーションメニューコンポーネント - サイトのメインナビゲーションに最適な階層メニュー",
			},
		},
		layout: "centered",
	},
};

export default meta;
type Story = StoryObj<typeof NavigationMenu>;

export const Default: Story = {
	render: () => (
		<NavigationMenu>
			<NavigationMenuList>
				<NavigationMenuItem>
					<NavigationMenuTrigger>コンテンツ</NavigationMenuTrigger>
					<NavigationMenuContent>
						<div className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
							<div className="row-span-3">
								<NavigationMenuLink asChild>
									<a
										className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-suzuka-500/20 to-suzuka-600/20 p-6 no-underline outline-none focus:shadow-md"
										href="#"
									>
										<PlayCircle className="h-6 w-6" />
										<div className="mb-2 mt-4 text-lg font-medium">
											suzumina.click
										</div>
										<p className="text-sm leading-tight text-muted-foreground">
											涼花みなせの音声ボタンと動画を楽しめるファンサイト
										</p>
									</a>
								</NavigationMenuLink>
							</div>
							<div className="grid gap-1">
								<NavigationMenuLink asChild>
									<a href="#" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
										<div className="text-sm font-medium leading-none">音声ボタン</div>
										<p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
											涼花みなせの音声を楽しめるボタン集
										</p>
									</a>
								</NavigationMenuLink>
								<NavigationMenuLink asChild>
									<a href="#" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
										<div className="text-sm font-medium leading-none">動画一覧</div>
										<p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
											YouTube動画の一覧とお気に入り管理
										</p>
									</a>
								</NavigationMenuLink>
								<NavigationMenuLink asChild>
									<a href="#" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
										<div className="text-sm font-medium leading-none">作品一覧</div>
										<p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
											DLsite作品の情報と購入リンク
										</p>
									</a>
								</NavigationMenuLink>
							</div>
						</div>
					</NavigationMenuContent>
				</NavigationMenuItem>
				<NavigationMenuItem>
					<NavigationMenuTrigger>コミュニティ</NavigationMenuTrigger>
					<NavigationMenuContent>
						<div className="grid w-[400px] gap-3 p-4 md:grid-cols-2">
							<NavigationMenuLink asChild>
								<a href="#" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
									<Users className="h-4 w-4 mb-2" />
									<div className="text-sm font-medium leading-none">Discord</div>
									<p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
										ファンコミュニティに参加
									</p>
								</a>
							</NavigationMenuLink>
							<NavigationMenuLink asChild>
								<a href="#" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
									<ExternalLink className="h-4 w-4 mb-2" />
									<div className="text-sm font-medium leading-none">公式サイト</div>
									<p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
										涼花みなせ公式ホームページ
									</p>
								</a>
							</NavigationMenuLink>
						</div>
					</NavigationMenuContent>
				</NavigationMenuItem>
				<NavigationMenuItem>
					<NavigationMenuLink href="#" className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50">
						設定
					</NavigationMenuLink>
				</NavigationMenuItem>
			</NavigationMenuList>
		</NavigationMenu>
	),
};

export const SimpleMenu: Story = {
	render: () => (
		<NavigationMenu>
			<NavigationMenuList>
				<NavigationMenuItem>
					<NavigationMenuTrigger>メニュー</NavigationMenuTrigger>
					<NavigationMenuContent>
						<div className="grid gap-1 p-2 w-[300px]">
							<NavigationMenuLink asChild>
								<a href="#" className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
									<div className="text-sm font-medium">項目1</div>
								</a>
							</NavigationMenuLink>
							<NavigationMenuLink asChild>
								<a href="#" className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
									<div className="text-sm font-medium">項目2</div>
								</a>
							</NavigationMenuLink>
							<NavigationMenuLink asChild>
								<a href="#" className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
									<div className="text-sm font-medium">項目3</div>
								</a>
							</NavigationMenuLink>
						</div>
					</NavigationMenuContent>
				</NavigationMenuItem>
			</NavigationMenuList>
		</NavigationMenu>
	),
};

export const WithIcons: Story = {
	render: () => (
		<NavigationMenu>
			<NavigationMenuList>
				<NavigationMenuItem>
					<NavigationMenuTrigger>メディア</NavigationMenuTrigger>
					<NavigationMenuContent>
						<div className="grid gap-1 p-2 w-[250px]">
							<NavigationMenuLink asChild>
								<a href="#" className="flex items-center select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
									<Video className="mr-3 h-4 w-4" />
									<div className="text-sm font-medium">動画</div>
								</a>
							</NavigationMenuLink>
							<NavigationMenuLink asChild>
								<a href="#" className="flex items-center select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
									<Music className="mr-3 h-4 w-4" />
									<div className="text-sm font-medium">音楽</div>
								</a>
							</NavigationMenuLink>
							<NavigationMenuLink asChild>
								<a href="#" className="flex items-center select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
									<PlayCircle className="mr-3 h-4 w-4" />
									<div className="text-sm font-medium">プレイリスト</div>
								</a>
							</NavigationMenuLink>
						</div>
					</NavigationMenuContent>
				</NavigationMenuItem>
			</NavigationMenuList>
		</NavigationMenu>
	),
};

export const MultipleMenus: Story = {
	render: () => (
		<NavigationMenu>
			<NavigationMenuList>
				<NavigationMenuItem>
					<NavigationMenuTrigger>音声</NavigationMenuTrigger>
					<NavigationMenuContent>
						<div className="grid gap-1 p-2 w-[200px]">
							<NavigationMenuLink asChild>
								<a href="#" className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
									<div className="text-sm font-medium">音声ボタン</div>
								</a>
							</NavigationMenuLink>
							<NavigationMenuLink asChild>
								<a href="#" className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
									<div className="text-sm font-medium">音声参照</div>
								</a>
							</NavigationMenuLink>
						</div>
					</NavigationMenuContent>
				</NavigationMenuItem>
				<NavigationMenuItem>
					<NavigationMenuTrigger>動画</NavigationMenuTrigger>
					<NavigationMenuContent>
						<div className="grid gap-1 p-2 w-[200px]">
							<NavigationMenuLink asChild>
								<a href="#" className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
									<div className="text-sm font-medium">最新動画</div>
								</a>
							</NavigationMenuLink>
							<NavigationMenuLink asChild>
								<a href="#" className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
									<div className="text-sm font-medium">人気動画</div>
								</a>
							</NavigationMenuLink>
							<NavigationMenuLink asChild>
								<a href="#" className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
									<div className="text-sm font-medium">プレイリスト</div>
								</a>
							</NavigationMenuLink>
						</div>
					</NavigationMenuContent>
				</NavigationMenuItem>
				<NavigationMenuItem>
					<NavigationMenuLink href="#" className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50">
						<Settings className="mr-2 h-4 w-4" />
						設定
					</NavigationMenuLink>
				</NavigationMenuItem>
			</NavigationMenuList>
		</NavigationMenu>
	),
};

export const WithoutViewport: Story = {
	render: () => (
		<NavigationMenu viewport={false}>
			<NavigationMenuList>
				<NavigationMenuItem>
					<NavigationMenuTrigger>シンプルメニュー</NavigationMenuTrigger>
					<NavigationMenuContent>
						<div className="grid gap-1 p-2 w-[200px]">
							<NavigationMenuLink asChild>
								<a href="#" className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
									<div className="text-sm font-medium">項目1</div>
								</a>
							</NavigationMenuLink>
							<NavigationMenuLink asChild>
								<a href="#" className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
									<div className="text-sm font-medium">項目2</div>
								</a>
							</NavigationMenuLink>
						</div>
					</NavigationMenuContent>
				</NavigationMenuItem>
			</NavigationMenuList>
		</NavigationMenu>
	),
};

export const RealWorldExample: Story = {
	render: () => (
		<div className="w-full border-b">
			<div className="container flex h-14 items-center">
				<div className="mr-4 flex">
					<a className="mr-6 flex items-center space-x-2" href="#">
						<div className="h-6 w-6 bg-suzuka-500 rounded"></div>
						<span className="font-bold">suzumina.click</span>
					</a>
					<NavigationMenu>
						<NavigationMenuList>
							<NavigationMenuItem>
								<NavigationMenuTrigger>音声</NavigationMenuTrigger>
								<NavigationMenuContent>
									<div className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
										<div className="row-span-3">
											<NavigationMenuLink asChild>
												<a
													className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-suzuka-500/20 to-suzuka-600/20 p-6 no-underline outline-none focus:shadow-md"
													href="#"
												>
													<PlayCircle className="h-6 w-6" />
													<div className="mb-2 mt-4 text-lg font-medium">
														音声ボタン
													</div>
													<p className="text-sm leading-tight text-muted-foreground">
														涼花みなせの様々な音声を楽しめる
													</p>
												</a>
											</NavigationMenuLink>
										</div>
										<div className="grid gap-1">
											<NavigationMenuLink asChild>
												<a href="#" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
													<div className="text-sm font-medium leading-none">音声ボタン一覧</div>
													<p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
														全ての音声ボタンを閲覧
													</p>
												</a>
											</NavigationMenuLink>
											<NavigationMenuLink asChild>
												<a href="#" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
													<div className="text-sm font-medium leading-none">音声参照</div>
													<p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
														YouTube動画の音声参照機能
													</p>
												</a>
											</NavigationMenuLink>
											<NavigationMenuLink asChild>
												<a href="#" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
													<div className="text-sm font-medium leading-none">新規作成</div>
													<p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
														新しい音声ボタンを作成
													</p>
												</a>
											</NavigationMenuLink>
										</div>
									</div>
								</NavigationMenuContent>
							</NavigationMenuItem>
							<NavigationMenuItem>
								<NavigationMenuLink href="#" className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50">
									動画
								</NavigationMenuLink>
							</NavigationMenuItem>
							<NavigationMenuItem>
								<NavigationMenuLink href="#" className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50">
									作品
								</NavigationMenuLink>
							</NavigationMenuItem>
						</NavigationMenuList>
					</NavigationMenu>
				</div>
			</div>
		</div>
	),
};