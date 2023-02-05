import { EventType, GenerateEvent } from '../shared';
import generate from './generate';

let cancel: () => unknown | undefined;

self.onmessage = (e: MessageEvent<GenerateEvent>) => {
  const msg = e.data;

  if (msg.type === EventType.generate) {
    const { pickCount } = e.data;

    cancel = generate(pickCount, data =>
      self.postMessage({ type: EventType.progress, ...data })
    );
  } else if (msg.type === EventType.cancel) {
    cancel?.();
  }
};
