"use client";

interface ThumbnailImageProps {
  src: string;
  alt: string;
  className?: string;
}

export default function ThumbnailImage({
  src,
  alt,
  className,
}: ThumbnailImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.src =
          "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9Ijk2IiB2aWV3Qm94PSIwIDAgMTI4IDk2IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTI4IiBoZWlnaHQ9Ijk2IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik02NCAzMkM1Ni4yNjggMzIgNTAgMzguMjY4IDUwIDQ2VjUwQzUwIDU3LjczMiA1Ni4yNjggNjQgNjQgNjRINjhDNzUuNzMyIDY0IDgyIDU3LjczMiA4MiA1MFY0NkM4MiAzOC4yNjggNzUuNzMyIDMyIDY4IDMySDY0WiIgZmlsbD0iIzkxQTNCMyIvPgo8L3N2Zz4K";
      }}
    />
  );
}
