export function formatTime(positionInSeconds: number): string {
  const safePosition = Number.isFinite(positionInSeconds) ? Math.max(0, positionInSeconds) : 0;
  const hours = Math.floor(safePosition / 3_600);
  const minutes = Math.floor((safePosition % 3_600) / 60);
  const seconds = Math.floor(safePosition % 60);

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

export function timestampToSeconds(timestamp: string): number | undefined {
  const match = /^(\d+):([0-5]\d):([0-5]\d)$/.exec(timestamp);
  if (!match) return undefined;

  const [, hours, minutes, seconds] = match;
  if (hours === undefined || minutes === undefined || seconds === undefined) return undefined;
  return Number(hours) * 3_600 + Number(minutes) * 60 + Number(seconds);
}
