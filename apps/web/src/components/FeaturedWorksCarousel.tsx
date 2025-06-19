import type { FrontendDLsiteWorkData } from "@suzumina.click/shared-types/src/work";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@suzumina.click/ui/components/carousel";
import WorkCard from "@/app/works/components/WorkCard";

interface FeaturedWorksCarouselProps {
  works: FrontendDLsiteWorkData[];
}

export function FeaturedWorksCarousel({ works }: FeaturedWorksCarouselProps) {
  if (works.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[280px] bg-muted rounded-lg">
        <p className="text-muted-foreground">新着作品を読み込み中...</p>
      </div>
    );
  }

  return (
    <Carousel className="w-full">
      <CarouselContent className="-ml-2 md:-ml-4">
        {works.map((work) => (
          <CarouselItem
            key={work.id}
            className="pl-2 md:pl-4 basis-full xs:basis-1/2 sm:basis-1/3 lg:basis-1/4 xl:basis-1/5"
          >
            <WorkCard work={work} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-2" />
      <CarouselNext className="right-2" />
    </Carousel>
  );
}
