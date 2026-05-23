import { WrappedData } from "../../src/data";

export type ArchiveStatus = "queued" | "rendering" | "ready" | "failed";

export type WrapPhase =
  | "queued"
  | "collecting"
  | "copy"
  | "aggregating"
  | "rendering"
  | "finishing";
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
  /** 0–100 for UI progress bar */
  progress?: number;
  phase?: WrapPhase;
  progressMessage?: string;
  source: ArchiveSource;
  triggeredBy?: string; // member id or slack user id
  postedToSlack: boolean;
  slackChannelId?: string;
  filePath?: string;
  data?: WrappedData;
  error?: string;
};
