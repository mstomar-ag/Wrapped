import cron, { type ScheduledTask } from "node-cron";
import { WebClient } from "@slack/web-api";
import { listMembers } from "../members/store";
import { parseWindow } from "../window";
import { runWrapForMember } from "../wrap-runner";
import { readSchedule } from "./config";

let task: ScheduledTask | null = null;

export const startScheduler = () => {
  const cfg = readSchedule();
  stopScheduler();
  if (!cfg.enabled) {
    console.log("[scheduler] disabled");
    return;
  }
  task = cron.schedule(
    cfg.cron,
    () => runWeekly().catch((e) => console.error("[scheduler] weekly run failed", e)),
    { timezone: cfg.timezone ?? "Asia/Kolkata" },
  );
  console.log(`[scheduler] enabled: cron="${cfg.cron}" tz=${cfg.timezone ?? "(host)"}`);
};

export const stopScheduler = () => {
  if (task) {
    task.stop();
    task = null;
    console.log("[scheduler] stopped");
  }
};

export const restartScheduler = () => {
  stopScheduler();
  startScheduler();
};

export const runWeekly = async () => {
  const cfg = readSchedule();
  const members = listMembers();
  console.log(`[scheduler] running for ${members.length} members`);
  const slackToken = process.env.SLACK_BOT_TOKEN;
  const slack = slackToken ? new WebClient(slackToken) : null;

  for (const member of members) {
    const win = parseWindow(cfg.window);
    try {
      const result = await runWrapForMember({
        member,
        win,
        source: "scheduler",
        triggeredBy: "scheduler",
        post: cfg.postTo === "channel" && cfg.channelId ? { channelId: cfg.channelId } : null,
      });
      console.log(`[scheduler] ${member.id} → ${result.id} (${result.filePath})`);

      // If posting to DM and we have a slack client, open IM and upload
      if (cfg.postTo === "dm" && slack && member.socials.slack?.userId && result.filePath) {
        const im = await slack.conversations.open({ users: member.socials.slack.userId });
        if (im.channel?.id) {
          const { postVideoToChannel } = await import("../slack/post");
          await postVideoToChannel(im.channel.id, result.filePath, `Your week, wrapped.`);
        }
      }
    } catch (e) {
      console.error(`[scheduler] failed for ${member.id}:`, (e as Error).message);
    }
  }
};
