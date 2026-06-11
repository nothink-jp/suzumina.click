"use client";

import type { WorkListResultPlain } from "@suzumina.click/shared-types";
import { useCallback } from "react";
import {
	type OwnerWorksListParams,
	WorksListForOwner,
} from "@/components/work/works-list-for-owner";
import { getCreatorWorksList } from "../actions";

interface CreatorWorksListProps {
	creatorId: string;
	initialData?: WorkListResultPlain;
}

export default function CreatorWorksList({ creatorId, initialData }: CreatorWorksListProps) {
	const fetchWorks = useCallback(
		(params: OwnerWorksListParams) => getCreatorWorksList({ ...params, creatorId }),
		[creatorId],
	);
	return <WorksListForOwner initialData={initialData} fetchWorks={fetchWorks} />;
}
