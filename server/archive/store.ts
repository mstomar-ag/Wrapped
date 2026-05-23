import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ArchiveEntry, ArchiveStatus } from "./types";

const STORE_PATH = path.resolve(import.meta.dirname, "../../data/archive.json");

const ensure = () => {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, "[]", "utf8");
};

const read = (): ArchiveEntry[] => {
  ensure();
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as ArchiveEntry[];
  } catch {
    return [];
  }
};

const write = (entries: ArchiveEntry[]) => {
  ensure();
  fs.writeFileSync(STORE_PATH, JSON.stringify(entries, null, 2), "utf8");
};

export const newId = (): string => crypto.randomBytes(8).toString("hex");

export const createEntry = (
  partial: Omit<ArchiveEntry, "id" | "createdAt" | "status">,
): ArchiveEntry => {
  const entry: ArchiveEntry = {
    id: newId(),
    createdAt: new Date().toISOString(),
    status: "queued",
    ...partial,
  };
  const all = read();
  all.unshift(entry);
  write(all);
  console.log(`[archive] created ${entry.id} (${entry.source}/${entry.kind}/${entry.subject})`);
  return entry;
};

export const updateEntry = (id: string, patch: Partial<ArchiveEntry>): ArchiveEntry | undefined => {
  const all = read();
  const idx = all.findIndex((e) => e.id === id);
  if (idx === -1) return undefined;
  all[idx] = { ...all[idx], ...patch };
  write(all);
  return all[idx];
};

export const setStatus = (
  id: string,
  status: ArchiveStatus,
  extras: Partial<ArchiveEntry> = {},
) => {
  const e = updateEntry(id, { status, ...extras });
  if (e) console.log(`[archive] ${id} → ${status}`);
  return e;
};

export const getEntry = (id: string): ArchiveEntry | undefined => read().find((e) => e.id === id);

export type ArchiveFilters = {
  subject?: string;
  kind?: "member" | "channel";
  status?: ArchiveStatus;
  limit?: number;
};

export const listEntries = (filters: ArchiveFilters = {}): ArchiveEntry[] => {
  let all = read();
  if (filters.subject) all = all.filter((e) => e.subject === filters.subject);
  if (filters.kind) all = all.filter((e) => e.kind === filters.kind);
  if (filters.status) all = all.filter((e) => e.status === filters.status);
  if (filters.limit) all = all.slice(0, filters.limit);
  return all;
};

export const deleteEntry = (id: string): boolean => {
  const all = read();
  const next = all.filter((e) => e.id !== id);
  if (next.length === all.length) return false;
  write(next);
  return true;
};
