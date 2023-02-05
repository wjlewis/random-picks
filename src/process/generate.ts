import { ProgressEvent, PicksData } from '../shared';
import { randomElt, Pt } from '../tools';

export default function generate(
  pickCount: number,
  onProgress: (e: Omit<ProgressEvent, 'type'>) => unknown
): () => unknown {
  const cancelRef = { current: null };

  const root = { x: 0, y: 0 };
  const centers = new Set([serialize(root)]);
  const frontier = new Set(getTips(root).map(serialize));

  const batchCount = 1_000;

  function getPicksData(): PicksData {
    return {
      centers: [...centers].map(deserialize),
      frontier: [...frontier].map(deserialize),
    };
  }

  function processBatch() {
    const batchSize = Math.min(batchCount, pickCount - centers.size);

    for (let i = 0; i < batchSize; i++) {
      const serializedNext = randomElt([...frontier]);
      const next = deserialize(serializedNext);

      centers.add(serializedNext);
      frontier.delete(serializedNext);

      for (const tip of getTips(next)) {
        const serializedTip = serialize(tip);
        if (frontier.has(serializedTip)) {
          frontier.delete(serializedTip);
        } else if (!centers.has(serializedTip)) {
          frontier.add(serializedTip);
        }
      }
    }

    const done = centers.size === pickCount;
    onProgress({
      percent: done ? null : (centers.size / pickCount) * 100,
      picks: getPicksData(),
    });

    if (!done) {
      cancelRef.current = setTimeout(processBatch, 1);
    }
  }

  cancelRef.current = setTimeout(processBatch, 1);

  return () => {
    clearTimeout(cancelRef.current);
    onProgress({ percent: null, picks: getPicksData() });
  };
}

function serialize(pt: Pt): string {
  return `${pt.x}:${pt.y}`;
}

function deserialize(str: string): Pt {
  const [x, y] = str.split(':').map(Number);
  return { x, y };
}

export function getTips({ x, y }: Pt): [Pt, Pt] {
  return isHorizontal({ x, y })
    ? [
        { x: x + 1, y },
        { x: x - 1, y },
      ]
    : [
        { x, y: y + 1 },
        { x, y: y - 1 },
      ];
}

function isHorizontal({ x, y }: Pt): boolean {
  return (((x + y) % 2) + 2) % 2 === 0;
}
