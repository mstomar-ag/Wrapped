export const TRACKS = [
  "music/01-funky-energy.mp3",
  "music/02-energizing.mp3",
  "music/03-city-run.mp3",
] as const;

// Deterministic per-string hash so the same member id always gets the same track.
export const pickTrack = (seed: string): string => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TRACKS[h % TRACKS.length];
};
