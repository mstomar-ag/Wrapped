import { WrappedData } from "../../src/data";

export type ArchiveStatus = "queued" | "rendering" | "ready" | "failed";
export type ArchiveSource = "ui" | "slack" | "scheduler" | "cli";

export type ArchiveEntry = {
  id: string;
  kind: "member" | "channel";
  subject: string; // member id or channel id
  subjectName: string; // display name
  windowFrom: string; // ISO
  windowTo: string; // ISO
  windowLabel: string; // human readable
  createdAt: string; // ISO
  status: ArchiveStatus;
  source: ArchiveSource;
  triggeredBy?: string; // member id or slack user id
  postedToSlack: boolean;
  slackChannelId?: string;
  filePath?: string;
  data?: WrappedData;
  error?: string;
};
