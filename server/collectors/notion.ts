import { Member } from "../members/types";
import { DateWindow } from "./types";

export type NotionSignals = {
  pagesEdited: number;
  pagesCreated: number;
  topPage: { title: string; url: string } | null;
};

// Notion's search API returns recent pages; filter by last_edited_by + time.
// Activation requires NOTION_TOKEN (workspace integration token).
export const collectNotion = async (
  member: Member,
  win: DateWindow,
): Promise<NotionSignals | null> => {
  const token = process.env.NOTION_TOKEN;
  const notionUserId = member.socials.notion?.userId;
  if (!token || !notionUserId) return null;

  const res = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      filter: { value: "page", property: "object" },
      sort: { direction: "descending", timestamp: "last_edited_time" },
      page_size: 100,
    }),
  });
  if (!res.ok) return null;
  type NotionTitleProp = { type: "title"; title: Array<{ plain_text?: string }> };
  type NotionPage = {
    url?: string;
    last_edited_time?: string;
    created_time?: string;
    last_edited_by?: { id?: string };
    created_by?: { id?: string };
    properties?: Record<string, NotionTitleProp | { type: string }>;
  };
  const json = (await res.json()) as { results?: NotionPage[] };

  const inWindow = (iso?: string) =>
    iso && new Date(iso) >= win.start && new Date(iso) <= win.end;

  const edited =
    json.results?.filter(
      (p) => p.last_edited_by?.id === notionUserId && inWindow(p.last_edited_time),
    ) ?? [];
  const created =
    json.results?.filter(
      (p) => p.created_by?.id === notionUserId && inWindow(p.created_time),
    ) ?? [];

  const titleOf = (p: NotionPage): string => {
    const titleProp = Object.values(p.properties ?? {}).find(
      (v): v is NotionTitleProp => v?.type === "title",
    );
    return titleProp?.title?.[0]?.plain_text ?? "(untitled)";
  };

  const top = edited[0];
  return {
    pagesEdited: edited.length,
    pagesCreated: created.length,
    topPage: top ? { title: titleOf(top), url: top.url ?? "" } : null,
  };
};
