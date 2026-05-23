import { WebClient } from "@slack/web-api";
import fs from "node:fs";
import path from "node:path";

export const postVideoToChannel = async (
  channelId: string,
  filePath: string,
  comment: string,
) => {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.log(`[stub] would post ${filePath} to ${channelId}: ${comment}`);
    return;
  }
  const client = new WebClient(token);
  await client.files.uploadV2({
    channel_id: channelId,
    file: fs.createReadStream(filePath),
    filename: path.basename(filePath),
    initial_comment: comment,
  });
};

export const respondToSlashCommand = async (
  responseUrl: string,
  text: string,
  inChannel = false,
) => {
  await fetch(responseUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      response_type: inChannel ? "in_channel" : "ephemeral",
      text,
    }),
  });
};
