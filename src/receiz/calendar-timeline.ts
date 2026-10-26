// Existing Receiz Calendar overlap/lane layout; presentation only.
export const BASE_TIMELINE_HOUR_HEIGHT = 56;
export const TIMELINE_ZOOM_LEVELS = [0.75, 1, 1.5, 2, 3, 4, 6] as const;
export const DEFAULT_TIMELINE_ZOOM_INDEX = 1;

const MINUTES_PER_DAY = 24 * 60;
const DEFAULT_MIN_EVENT_HEIGHT_PX = 6;
const DEFAULT_EVENT_VERTICAL_GAP_PX = 6;
const DEFAULT_EVENT_HORIZONTAL_GAP_FRACTION = 0.018;

export type DayEventLayoutInput = {
  start: Date;
  end: Date;
};

export type DayEventLayout<T extends DayEventLayoutInput> = {
  event: T;
  topPx: number;
  heightPx: number;
  laneIndex: number;
  laneCount: number;
  leftFraction: number;
  widthFraction: number;
};

type NormalizedDayEvent<T extends DayEventLayoutInput> = {
  event: T;
  startMinute: number;
  endMinute: number;
  laneIndex: number;
};

function clampMinuteRange<T extends DayEventLayoutInput>(event: T, dayStartMs: number): NormalizedDayEvent<T> | null {
  const startMinute = Math.max(0, Math.floor((event.start.getTime() - dayStartMs) / 60_000));
  const rawEndMinute = Math.min(MINUTES_PER_DAY, Math.ceil((event.end.getTime() - dayStartMs) / 60_000));
  const endMinute = Math.max(startMinute + 1, rawEndMinute);
  if (startMinute >= MINUTES_PER_DAY) return null;
  return {
    event,
    startMinute,
    endMinute,
    laneIndex: 0,
  };
}

function rangesOverlap(left: NormalizedDayEvent<DayEventLayoutInput>, right: NormalizedDayEvent<DayEventLayoutInput>): boolean {
  return left.startMinute < right.endMinute && right.startMinute < left.endMinute;
}

export function resolveTimelineHourHeight(zoom: number): number {
  return Math.max(28, Math.round(BASE_TIMELINE_HOUR_HEIGHT * zoom));
}

export function buildDayEventLayouts<T extends DayEventLayoutInput>(
  events: readonly T[],
  dayStart: Date,
  hourHeight: number,
  options?: {
    minEventHeightPx?: number;
    verticalGapPx?: number;
    horizontalGapFraction?: number;
  },
): DayEventLayout<T>[] {
  const minEventHeightPx = options?.minEventHeightPx ?? DEFAULT_MIN_EVENT_HEIGHT_PX;
  const verticalGapPx = options?.verticalGapPx ?? DEFAULT_EVENT_VERTICAL_GAP_PX;
  const horizontalGapFraction = options?.horizontalGapFraction ?? DEFAULT_EVENT_HORIZONTAL_GAP_FRACTION;
  const dayStartMs = dayStart.getTime();

  const normalizedEvents = events
    .map((event) => clampMinuteRange(event, dayStartMs))
    .filter((event): event is NormalizedDayEvent<T> => Boolean(event))
    .sort((left, right) => left.startMinute - right.startMinute || left.endMinute - right.endMinute);

  if (!normalizedEvents.length) return [];

  const clusters: Array<NormalizedDayEvent<T>[]> = [];
  let currentCluster: NormalizedDayEvent<T>[] = [];
  let currentClusterEndMinute = -1;

  for (const event of normalizedEvents) {
    if (!currentCluster.length || event.startMinute < currentClusterEndMinute) {
      currentCluster.push(event);
      currentClusterEndMinute = Math.max(currentClusterEndMinute, event.endMinute);
      continue;
    }

    clusters.push(currentCluster);
    currentCluster = [event];
    currentClusterEndMinute = event.endMinute;
  }

  if (currentCluster.length) {
    clusters.push(currentCluster);
  }

  return clusters.flatMap((cluster) => {
    const lanes: Array<NormalizedDayEvent<T>[]> = [];

    for (const event of cluster) {
      let laneIndex = lanes.findIndex((lane) => {
        const last = lane[lane.length - 1];
        return !last || last.endMinute <= event.startMinute;
      });
      if (laneIndex === -1) {
        laneIndex = lanes.length;
        lanes.push([]);
      }
      const placed = { ...event, laneIndex };
      lanes[laneIndex].push(placed);
      event.laneIndex = laneIndex;
    }

    const laneCount = Math.max(1, lanes.length);
    const totalGapFraction = horizontalGapFraction * Math.max(0, laneCount - 1);
    const laneWidthFraction = Math.max(0, (1 - totalGapFraction) / laneCount);

    return cluster.map((event) => {
      let laneSpan = 1;
      for (let laneIndex = event.laneIndex + 1; laneIndex < laneCount; laneIndex += 1) {
        const laneHasOverlap = lanes[laneIndex].some((candidate) => rangesOverlap(event, candidate));
        if (laneHasOverlap) break;
        laneSpan += 1;
      }

      const durationMinutes = Math.max(1, event.endMinute - event.startMinute);
      const actualHeightPx = (durationMinutes / 60) * hourHeight;
      const heightPx = Math.max(minEventHeightPx, actualHeightPx - verticalGapPx);
      const leftFraction = event.laneIndex * (laneWidthFraction + horizontalGapFraction);
      const widthFraction = laneWidthFraction * laneSpan + horizontalGapFraction * Math.max(0, laneSpan - 1);

      return {
        event: event.event,
        topPx: (event.startMinute / 60) * hourHeight,
        heightPx,
        laneIndex: event.laneIndex,
        laneCount,
        leftFraction,
        widthFraction,
      };
    });
  });
}
