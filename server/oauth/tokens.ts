import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const STORE = path.resolve(import.meta.dirname, "../../data/tokens.json");
const ALG = "aes-256-gcm";

const key = (): Buffer => {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY not set (32+ char string)");
  return crypto.createHash("sha256").update(raw).digest();
};

const encrypt = (plain: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALG, key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
};

const decrypt = (cipher: string): string => {
  const [iv, tag, enc] = cipher.split(".").map((b) => Buffer.from(b, "base64"));
  const dec = crypto.createDecipheriv(ALG, key(), iv);
  dec.setAuthTag(tag);
  return Buffer.concat([dec.update(enc), dec.final()]).toString("utf8");
};

export type ProviderTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
};

type TokenStore = Record<string, Record<string, string>>; // memberId -> provider -> ciphertext

const read = (): TokenStore => {
  try {
    return JSON.parse(fs.readFileSync(STORE, "utf8"));
  } catch {
    return {};
  }
};

const write = (store: TokenStore) => {
  fs.mkdirSync(path.dirname(STORE), { recursive: true });
  fs.writeFileSync(STORE, JSON.stringify(store, null, 2));
};

export const saveTokens = (memberId: string, provider: string, tokens: ProviderTokens) => {
  const store = read();
  store[memberId] = store[memberId] ?? {};
  store[memberId][provider] = encrypt(JSON.stringify(tokens));
  write(store);
};

export const getTokens = (memberId: string, provider: string): ProviderTokens | null => {
  const store = read();
  const cipher = store[memberId]?.[provider];
  if (!cipher) return null;
  try {
    return JSON.parse(decrypt(cipher)) as ProviderTokens;
  } catch {
    return null;
  }
};

export const deleteTokens = (memberId: string, provider: string) => {
  const store = read();
  if (store[memberId]) {
    delete store[memberId][provider];
    write(store);
  }
};

export const listLinkedProviders = (memberId: string): string[] => {
  const store = read();
  return Object.keys(store[memberId] ?? {});
};
