import { isTrustedSource } from '@shared/sources-trust';

import type { CloudPreference } from './profile';

import { supabase } from '@/lib/supabase';

/**
 * What changed this week.
 *
 * Reads the ingested vendor release notes rather than the local content
 * bank's timestamps. An earlier version reported items whose `updatedAt`
 * looked recent, which on a fresh device meant the entire bundle: that
 * measured when the phone first saw an item, not when anything changed.
 *
 * These are the actual feeds the nightly job pulls, each with its official
 * URL, so the claim that the curriculum tracks vendor releases is something
 * the reader can check rather than something the app asserts.
 */

export interface ReleaseNote {
  id: string;
  title: string;
  url: string;
  vendor: 'Google Cloud' | 'AWS' | 'Azure';
  publishedAt: string | null;
}

const VENDOR: Record<string, ReleaseNote['vendor']> = {
  gcp_release_notes: 'Google Cloud',
  gcp_vertex_release_notes: 'Google Cloud',
  aws_whats_new: 'AWS',
  azure_updates: 'Azure',
};

/**
 * Which feeds belong to which cloud.
 *
 * The card follows the same preference the question bank does. Someone who
 * works on Google Cloud does not need to be told what shipped on Azure this
 * week, and a freshness card full of irrelevant vendors is noise pretending to
 * be diligence.
 */
const FEEDS_BY_CLOUD: Record<CloudPreference, string[] | null> = {
  gcp: ['gcp_release_notes', 'gcp_vertex_release_notes'],
  aws: ['aws_whats_new'],
  azure: ['azure_updates'],
  all: null,
};

export async function recentReleaseNotes(
  cloud: CloudPreference = 'all',
  withinDays = 7,
  limit = 6
): Promise<{ notes: ReleaseNote[]; total: number; days: number }> {
  if (!supabase) return { notes: [], total: 0, days: withinDays };

  const feeds = FEEDS_BY_CLOUD[cloud];

  /**
   * Feeds publish at wildly different rates: Azure posts many times a day,
   * Google Cloud sometimes goes quiet for a week. A fixed window would leave a
   * Google user staring at an empty card, so widen it once rather than show
   * nothing and imply the pipeline is broken.
   */
  for (const days of [withinDays, withinDays * 4]) {
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    let query = supabase
      .from('source_documents')
      .select('id, title, url, source_key, published_at, body')
      .gte('published_at', since)
      .order('published_at', { ascending: false })
      .limit(80);

    if (feeds) query = query.in('source_key', feeds);

    const { data, error } = await query;
    if (error || !data) return { notes: [], total: 0, days };

    const result = dedupe(data, limit);
    if (result.notes.length > 0 || days !== withinDays) {
      return { ...result, days };
    }
  }

  return { notes: [], total: 0, days: withinDays };
}

interface SourceRow {
  id: string;
  title: string;
  url: string;
  source_key: string;
  published_at: string | null;
  body: string | null;
}

/** Google's release feed titles every entry with the date it was published. */
const BARE_DATE = /^[A-Z][a-z]+ \d{1,2}, \d{4}$/;

/**
 * A headline worth reading.
 *
 * Google's release-notes feed uses the publication date as the entry title,
 * so a list of them reads "August 05, 2026" six times over and says nothing.
 * When the title is a bare date the first sentence of the body is the real
 * headline, and the date is already shown beneath it anyway.
 */
function headline(row: SourceRow): string {
  const title = row.title.trim();
  if (!BARE_DATE.test(title)) return title;

  const body = (row.body ?? '').trim();
  if (body.length < 12) return title;

  // Feed bodies open with a category label like "Compute Engine" often enough
  // that keeping it is useful context rather than noise.
  const sentence = body.split(/(?<=[.!?])\s/)[0] ?? body;
  return sentence.length > 160 ? `${sentence.slice(0, 157)}...` : sentence;
}

function dedupe(data: SourceRow[], limit: number): { notes: ReleaseNote[]; total: number } {

  const seen = new Set<string>();
  const notes: ReleaseNote[] = [];

  for (const row of data) {
    // The feeds repeat headlines across days, and a list showing the same
    // title three times reads as a bug even when the rows are distinct.
    const display = headline(row);
    const key = display.trim().toLowerCase();
    if (seen.has(key)) continue;
    if (!isTrustedSource(row.url)) continue;
    seen.add(key);

    notes.push({
      id: row.id,
      title: display,
      url: row.url,
      vendor: VENDOR[row.source_key] ?? 'Google Cloud',
      publishedAt: row.published_at,
    });
  }

  return { notes: notes.slice(0, limit), total: seen.size };
}
