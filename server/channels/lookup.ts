import { WebClient } from "@slack/web-api";

let slackClient: WebClient | null = null;
const getClient = () => {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return null;
  if (!slackClient) slackClient = new WebClient(token);
  return slackClient;
};

// In-memory cache (channel-name → ID). Names rarely change; safe for a long process.
const cache = new Map<string, { id: string; name: string }>();

// Accepts: "wrapped-test", "#wrapped-test", "<#C0B5N5BRBUM|wrapped-test>", or "C0B5N5BRBUM"
export const resolveChannel = async (
  input: string,
): Promise<{ id: string; name: string } | null> => {
  const trimmed = input.trim();

  // Already a channel ID
  if (/^C[A-Z0-9]{8,}$/.test(trimmed)) {
    return await fetchById(trimmed);
  }

  // Slack-encoded mention like <#C123|name>
  const mention = trimmed.match(/^<#(C[A-Z0-9]+)(?:\|([^>]+))?>$/);
  if (mention) {
    if (mention[2]) return { id: mention[1], name: mention[2] };
    return await fetchById(mention[1]);
  }

  // Plain name (with or without leading #)
  const name = trimmed.replace(/^#/, "").toLowerCase();
  if (cache.has(name)) return cache.get(name)!;

  const slack = getClient();
  if (!slack) return null;

  // Paginate all conversations until we find it. Caches everything we see.
  let cursor: string | undefined;
  do {
    const res = await slack.conversations.list({
      exclude_archived: true,
      types: "public_channel,private_channel",
      limit: 1000,
      cursor,
    });
    for (const ch of res.channels ?? []) {
      if (ch.id && ch.name) {
        const entry = { id: ch.id, name: ch.name };
        cache.set(ch.name.toLowerCase(), entry);
        if (ch.name.toLowerCase() === name) return entry;
      }
    }
    cursor = res.response_metadata?.next_cursor || undefined;
  } while (cursor);

  return null;
};

const fetchById = async (id: string): Promise<{ id: string; name: string } | null> => {
  const slack = getClient();
  if (!slack) return null;
  try {
    const info = await slack.conversations.info({ channel: id });
    const name = info.channel?.name ?? id;
    const entry = { id, name };
    cache.set(name.toLowerCase(), entry);
    return entry;
  } catch {
    return null;
  }
};
