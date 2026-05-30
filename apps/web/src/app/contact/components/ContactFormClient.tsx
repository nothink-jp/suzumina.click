"use client";

import { Skeleton } from "@suzumina.click/ui/components/ui/skeleton";
import dynamic from "next/dynamic";

/**
 * ContactForm の遅延読み込みフォールバック。
 * 実フォーム (種別 select / 件名 / 内容 textarea / メール / 送信ボタン) の
 * 構造と高さに近づけて CLS を抑える。
 */
function ContactFormSkeleton() {
	return (
		<div className="space-y-6" data-testid="contact-form-skeleton" aria-hidden>
			{/* お問い合わせ種別 */}
			<div className="space-y-2">
				<Skeleton className="h-5 w-32" />
				<Skeleton className="h-10 w-full" />
			</div>
			{/* 件名 */}
			<div className="space-y-2">
				<Skeleton className="h-5 w-16" />
				<Skeleton className="h-10 w-full" />
			</div>
			{/* 内容 (rows=8) */}
			<div className="space-y-2">
				<Skeleton className="h-5 w-16" />
				<Skeleton className="h-48 w-full" />
			</div>
			{/* メールアドレス */}
			<div className="space-y-2">
				<Skeleton className="h-5 w-40" />
				<Skeleton className="h-10 w-full" />
			</div>
			{/* 送信ボタン */}
			<div className="pt-4">
				<Skeleton className="h-10 w-full" />
			</div>
		</div>
	);
}

/**
 * Server Component の page.tsx からは `next/dynamic({ ssr: false })` を直接呼べない
 * (`ssr: false is not allowed in Server Components`) ため、client wrapper 経由で
 * ContactForm を動的読み込みする。これにより Zod / react-hook-form を含む chunk が
 * /contact の First Load JS から外れる (SPR-72)。
 */
const ContactForm = dynamic(() => import("./ContactForm").then((m) => m.ContactForm), {
	ssr: false,
	loading: () => <ContactFormSkeleton />,
});

export function ContactFormClient() {
	return <ContactForm />;
}
