"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@suzumina.click/ui/components/ui/card";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useState } from "react";
import { formatWorkDescription, generateDescriptionSummary } from "@/utils/format-description";

interface WorkDescriptionProps {
	description: string;
	title: string;
}

export default function WorkDescription({ description, title }: WorkDescriptionProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	if (!description) {
		return null;
	}

	// 説明文が長い場合は折りたたみ表示（500文字以上で折りたたみ）
	const shouldTruncate = description.length > 500;
	const summary = generateDescriptionSummary(description, 400);
	const formattedDescription = formatWorkDescription(description);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<FileText className="h-5 w-5" />
					作品説明
				</CardTitle>
				<CardDescription>「{title}」の詳細説明</CardDescription>
			</CardHeader>
			<CardContent>
				{shouldTruncate && !isExpanded ? (
					<div>
						<p className="text-gray-700 leading-relaxed mb-4">{summary}</p>
						<button
							type="button"
							onClick={() => setIsExpanded(true)}
							className="text-primary hover:underline flex items-center gap-1 text-sm font-medium"
						>
							続きを読む
							<ChevronDown className="h-4 w-4" />
						</button>
					</div>
				) : (
					<div>
						<div
							dangerouslySetInnerHTML={{ __html: formattedDescription }}
							className="prose prose-sm max-w-none prose-gray [&_a]:text-primary [&_a]:no-underline [&_a]:hover:underline [&_strong]:text-gray-900 [&_ul]:my-2 [&_li]:my-1"
						/>
						{shouldTruncate && (
							<button
								type="button"
								onClick={() => setIsExpanded(false)}
								className="text-primary hover:underline flex items-center gap-1 text-sm font-medium mt-4"
							>
								折りたたむ
								<ChevronUp className="h-4 w-4" />
							</button>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
