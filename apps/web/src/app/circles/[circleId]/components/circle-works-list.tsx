"use client";

import type { WorkListResultPlain } from "@suzumina.click/shared-types";
import { useCallback } from "react";
import {
	type OwnerWorksListParams,
	WorksListForOwner,
} from "@/components/work/works-list-for-owner";
import { getCircleWorksList } from "../actions";

interface CircleWorksListProps {
	circleId: string;
	initialData?: WorkListResultPlain;
}

export default function CircleWorksList({ circleId, initialData }: CircleWorksListProps) {
	const fetchWorks = useCallback(
		(params: OwnerWorksListParams) => getCircleWorksList({ ...params, circleId }),
		[circleId],
	);
	return <WorksListForOwner initialData={initialData} fetchWorks={fetchWorks} />;
}
