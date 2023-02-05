export function randomElt<T>(xs: T[]): T {
  const i = Math.floor(Math.random() * xs.length);
  return xs[i];
}

export interface Pt {
  x: number;
  y: number;
}

export function clsx(...descs: ClassNameDescriptor[]): string {
  return descs
    .flatMap(desc =>
      desc && typeof desc === 'object'
        ? Object.entries(desc)
            .filter(([_className, include]) => !!include)
            .map(([className]) => className)
            .join(' ')
        : desc.toString()
    )
    .join(' ');
}

export type ClassNameDescriptor = string | { [className: string]: any };
