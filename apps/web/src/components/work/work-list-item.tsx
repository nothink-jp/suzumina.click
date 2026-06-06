import type { WorkPlainObject } from "@suzumina.click/shared-types";
import WorkCard from "@/app/works/components/work-card";

interface WorkListItemProps {
	work: WorkPlainObject;
	priority?: boolean;
}

export function WorkListItem({ work, priority = false }: WorkListItemProps) {
	return <WorkCard work={work} priority={priority} />;
}
