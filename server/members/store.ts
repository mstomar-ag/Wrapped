import fs from "node:fs";
import path from "node:path";
import { Member, SocialHandles } from "./types";

const STORE_PATH = path.resolve(import.meta.dirname, "../../data/members.json");

const ensure = () => {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, "[]", "utf8");
};

const read = (): Member[] => {
  ensure();
  return JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as Member[];
};

const write = (members: Member[]) => {
  ensure();
  fs.writeFileSync(STORE_PATH, JSON.stringify(members, null, 2), "utf8");
};

export const listMembers = (): Member[] => read();

export const findMember = (key: string): Member | undefined => {
  const k = key.toLowerCase().replace(/^@/, "");
  return read().find(
    (m) =>
      m.id === k ||
      m.name.toLowerCase() === k ||
      m.socials.slack?.handle?.toLowerCase() === k ||
      m.socials.slack?.userId === key ||
      m.socials.github?.username.toLowerCase() === k ||
      m.socials.x?.handle.toLowerCase() === k ||
      m.socials.email?.toLowerCase() === k,
  );
};

export const upsertMember = (member: Member): Member => {
  const all = read();
  const idx = all.findIndex((m) => m.id === member.id);
  if (idx === -1) all.push(member);
  else all[idx] = { ...all[idx], ...member, socials: { ...all[idx].socials, ...member.socials } };
  write(all);
  return all[idx === -1 ? all.length - 1 : idx];
};

export const updateSocials = (id: string, socials: Partial<SocialHandles>): Member | undefined => {
  const all = read();
  const idx = all.findIndex((m) => m.id === id);
  if (idx === -1) return undefined;
  all[idx] = { ...all[idx], socials: { ...all[idx].socials, ...socials } };
  write(all);
  return all[idx];
};

export const deleteMember = (id: string): boolean => {
  const all = read();
  const next = all.filter((m) => m.id !== id);
  if (next.length === all.length) return false;
  write(next);
  return true;
};
