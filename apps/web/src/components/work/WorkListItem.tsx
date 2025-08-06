import type { WorkPlainObject } from "@suzumina.click/shared-types";
import WorkCard from "@/app/works/components/WorkCard";

interface WorkListItemProps {
	work: WorkPlainObject;
}

export function WorkListItem({ work }: WorkListItemProps) {
	return <WorkCard work={work} />;
}
