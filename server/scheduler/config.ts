import fs from "node:fs";
import path from "node:path";

const PATH = path.resolve(import.meta.dirname, "../../data/schedule.json");

export type ScheduleConfig = {
  enabled: boolean;
  cron: string;
  postTo: "dm" | "channel";
  channelId?: string;
  channelName?: string;
  window: string;
  timezone?: string;
};

const DEFAULT: ScheduleConfig = {
  enabled: false,
  cron: "0 17 * * 5",
  postTo: "dm",
  window: "last-week",
  timezone: "Asia/Kolkata",
};

export const readSchedule = (): ScheduleConfig => {
  try {
    return { ...DEFAULT, ...JSON.parse(fs.readFileSync(PATH, "utf8")) };
  } catch {
    return DEFAULT;
  }
};

export const writeSchedule = (cfg: Partial<ScheduleConfig>): ScheduleConfig => {
  fs.mkdirSync(path.dirname(PATH), { recursive: true });
  const next = { ...readSchedule(), ...cfg };
  fs.writeFileSync(PATH, JSON.stringify(next, null, 2));
  return next;
};
