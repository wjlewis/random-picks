import { Pt } from './tools';

export enum EventType {
  generate = 'generate',
  progress = 'progress',
  cancel = 'cancel',
}

export type WorkerEvent = GenerateEvent | ProgressEvent;

export interface GenerateEvent extends BaseEvent {
  type: EventType.generate;
  pickCount: number;
}

export interface ProgressEvent extends BaseEvent {
  type: EventType.progress;
  percent: number;
  picks: PicksData;
}

export interface CancelEvent extends BaseEvent {
  type: EventType.cancel;
}

export interface PicksData {
  centers: Pt[];
  frontier: Pt[];
}

interface BaseEvent {
  type: EventType;
}
