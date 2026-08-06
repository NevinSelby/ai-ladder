/**
 * Source ingest, as a scheduled job.
 *
 * Originally written as a Supabase edge function. It runs here instead because
 * deploying an edge function needs an interactive CLI login, while this needs
 * only a database URL, and the repository is already wired to a host that can
 * run it on a schedule.
 *
 * Nothing in this file calls a model. Ingest is deliberately cheap and
 * idempotent so it can run often and the expensive stages can work against a
 * stable corpus. That separation is also why this half could ship before an
 * Anthropic key existed.
 *
 *   node pipeline/ingest.mjs
 *
 * Requires DATABASE_URL. Exits non-zero if every feed fails, so a scheduler
 * surfaces a broken run rather than reporting success forever.
 */

import crypto from 'node:crypto';
import pg from 'pg';

const FEEDS = [
  {
    key: 'gcp_release_notes',
    url: 'https://docs.cloud.google.com/feeds/gcp-release-notes.xml',
    kind: 'atom',
  },
  {
    key: 'gcp_vertex_release_notes',
    url: 'https://docs.cloud.google.com/feeds/vertex-ai-release-notes.xml',
    kind: 'atom',
  },
  {
    key: 'aws_whats_new',
    url: 'https://aws.amazon.com/about-aws/whats-new/recent/feed/',
    kind: 'rss',
  },
  {
    key: 'azure_updates',
    url: 'https://www.microsoft.com/releasecommunications/api/v2/azure/rss',
    kind: 'rss',
  },
];

const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Minimal feed parser. Regex rather than an XML dependency: these formats are
 * stable, the fields needed are few, and the parser only ever sees vendor
 * release feeds over https.
 */
function parseFeed(xml, kind) {
  const itemTag = kind === 'atom' ? 'entry' : 'item';
  const blocks = xml.match(new RegExp(`<${itemTag}[\\s\\S]*?</${itemTag}>`, 'gi')) ?? [];

  return blocks
    .map((block) => {
      const pick = (tag) => {
        const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
        return match ? stripTags(match[1]) : '';
      };

      const title = pick('title');
      const url =
        kind === 'atom'
          ? (block.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? '')
          : pick('link');
      const body = pick(kind === 'atom' ? 'content' : 'description') || pick('summary');
      const published = pick(kind === 'atom' ? 'updated' : 'pubDate') || pick('published') || '';
      const parsed = published ? new Date(published) : null;

      return {
        title,
        url,
        body,
        publishedAt: parsed && !Number.isNaN(parsed.valueOf()) ? parsed.toISOString() : null,
      };
    })
    .filter((entry) => entry.title && entry.url.startsWith('https://') && entry.body.length > 40);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const summary = {};
  let anySuccess = false;

  for (const feed of FEEDS) {
    try {
      const response = await fetch(feed.url, {
        headers: { 'user-agent': 'ai-ladder-ingest/1.0' },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        summary[feed.key] = { fetched: 0, inserted: 0, error: `HTTP ${response.status}` };
        continue;
      }

      const entries = parseFeed(await response.text(), feed.kind);
      let inserted = 0;

      for (const entry of entries) {
        // Dedupe on content, not URL: a page that gains a new entry should be
        // re-ingested, but re-reading an unchanged one must be free.
        const hash = sha256(`${feed.key}|${entry.url}|${entry.body}`);
        const result = await client.query(
          `insert into source_documents (content_hash, source_key, title, url, body, published_at)
           values ($1, $2, $3, $4, $5, $6)
           on conflict (content_hash) do nothing`,
          [
            hash,
            feed.key,
            entry.title.slice(0, 500),
            entry.url,
            entry.body.slice(0, 20_000),
            entry.publishedAt,
          ]
        );
        inserted += result.rowCount ?? 0;
      }

      summary[feed.key] = { fetched: entries.length, inserted };
      anySuccess = true;
    } catch (error) {
      summary[feed.key] = { fetched: 0, inserted: 0, error: String(error).slice(0, 200) };
    }
  }

  await client.end();
  console.log(JSON.stringify({ ranAt: new Date().toISOString(), summary }, null, 2));

  // A run where every feed failed is a broken run, not a quiet one.
  if (!anySuccess) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
