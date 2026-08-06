import { admin, json } from '../_shared/claude.ts';

/**
 * Source ingest.
 *
 * Pulls the feeds that make the curriculum go stale, deduped by content hash so
 * a re-run is free. This is the step that would have caught Vertex AI becoming
 * the Gemini Enterprise Agent Platform: the rename appears in the release-notes
 * feed, the staleness sweep matches it against items citing the old name, and
 * those items are pulled from rotation before anyone is taught the wrong thing.
 *
 * Nothing here calls a model: ingest is deliberately cheap and idempotent, so
 * it can run often and the expensive stages can run against a stable corpus.
 */

interface SourceFeed {
  key: string;
  url: string;
  kind: 'atom' | 'rss';
}

const FEEDS: SourceFeed[] = [
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
    key: 'gcp_blog_ai',
    url: 'https://cloudblog.withgoogle.com/products/ai-machine-learning/rss/',
    kind: 'rss',
  },
];

async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
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

interface ParsedEntry {
  title: string;
  url: string;
  body: string;
  publishedAt: string | null;
}

/**
 * Minimal feed parser.
 *
 * Deliberately regex-based rather than pulling an XML library: these two formats
 * are stable, the fields needed are few, and a dependency-free function is one
 * less thing to keep current in an edge runtime.
 */
function parseFeed(xml: string, kind: 'atom' | 'rss'): ParsedEntry[] {
  const itemTag = kind === 'atom' ? 'entry' : 'item';
  const blocks = xml.match(new RegExp(`<${itemTag}[\\s\\S]*?</${itemTag}>`, 'gi')) ?? [];

  return blocks
    .map((block) => {
      const pick = (tag: string) => {
        const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
        return match ? stripTags(match[1]) : '';
      };

      const title = pick('title');
      const url =
        kind === 'atom'
          ? (block.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? '')
          : pick('link');
      const body = pick(kind === 'atom' ? 'content' : 'description') || pick('summary');
      const published =
        pick(kind === 'atom' ? 'updated' : 'pubDate') || pick('published') || '';

      return {
        title,
        url,
        body,
        publishedAt: published ? new Date(published).toISOString() : null,
      };
    })
    .filter((entry) => entry.title && entry.url && entry.body.length > 40);
}

Deno.serve(async () => {
  const db = admin();
  const summary: Record<string, { fetched: number; inserted: number; error?: string }> = {};

  for (const feed of FEEDS) {
    try {
      const response = await fetch(feed.url, {
        headers: { 'user-agent': 'AI-Enabler-ingest/1.0' },
      });
      if (!response.ok) {
        summary[feed.key] = { fetched: 0, inserted: 0, error: `HTTP ${response.status}` };
        continue;
      }

      const entries = parseFeed(await response.text(), feed.kind);
      let inserted = 0;

      for (const entry of entries) {
        const hash = await sha256(`${feed.key}|${entry.url}|${entry.body}`);
        // Dedupe on content, not URL: a release-note page that gains a new entry
        // should be re-ingested, but re-reading an unchanged one must be free.
        const { error } = await db.from('source_documents').insert({
          content_hash: hash,
          source_key: feed.key,
          title: entry.title.slice(0, 500),
          url: entry.url,
          body: entry.body.slice(0, 20_000),
          published_at: entry.publishedAt,
        });
        if (!error) inserted += 1;
      }

      summary[feed.key] = { fetched: entries.length, inserted };
    } catch (error) {
      summary[feed.key] = {
        fetched: 0,
        inserted: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return json({ ok: true, summary });
});
