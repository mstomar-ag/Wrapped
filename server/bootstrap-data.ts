import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "./paths.js";

const DATA_DIR = path.join(PROJECT_ROOT, "data");
const SEED_DIR = path.join(PROJECT_ROOT, "seed-data");

const readJsonArray = (file: string): unknown[] | null => {
  if (!fs.existsSync(file)) return null;
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const copySeedIfMissing = (name: string, treatEmptyArrayAsMissing: boolean): boolean => {
  const src = path.join(SEED_DIR, name);
  const dst = path.join(DATA_DIR, name);
  if (!fs.existsSync(src)) return false;

  if (fs.existsSync(dst)) {
    if (!treatEmptyArrayAsMissing) return false;
    const rows = readJsonArray(dst);
    if (rows && rows.length > 0) return false;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.copyFileSync(src, dst);
  return true;
};

/** Railway volumes start empty and hide image `data/` — seed once from /app/seed-data or Slack. */
export const bootstrapDataIfNeeded = async (): Promise<void> => {
  const copiedMembers = copySeedIfMissing("members.json", true);
  const copiedArchive = copySeedIfMissing("archive.json", true);
  const copiedSchedule = copySeedIfMissing("schedule.json", false);

  if (copiedMembers || copiedArchive || copiedSchedule) {
    console.log(
      `[bootstrap] seeded data: members=${copiedMembers} archive=${copiedArchive} schedule=${copiedSchedule}`,
    );
    return;
  }

  const members = readJsonArray(path.join(DATA_DIR, "members.json"));
  if (members && members.length > 0) return;

  if (!process.env.SLACK_BOT_TOKEN) {
    console.log("[bootstrap] no members and no SLACK_BOT_TOKEN — skipping slack sync");
    return;
  }

  const { syncMembersFromSlack } = await import("./members/sync-slack.js");
  const result = await syncMembersFromSlack();
  console.log(
    `[bootstrap] synced ${result.total} members from Slack (${result.added} new, ${result.updated} updated)`,
  );
};
