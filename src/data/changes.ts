import { isTrustedSource } from '@shared/sources-trust';

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

export async function recentReleaseNotes(
  withinDays = 7,
  limit = 6
): Promise<{ notes: ReleaseNote[]; total: number }> {
  if (!supabase) return { notes: [], total: 0 };

  const since = new Date(Date.now() - withinDays * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from('source_documents')
    .select('id, title, url, source_key, published_at')
    .gte('published_at', since)
    .order('published_at', { ascending: false })
    .limit(60);

  if (error || !data) return { notes: [], total: 0 };

  const seen = new Set<string>();
  const notes: ReleaseNote[] = [];

  for (const row of data) {
    // The feeds repeat headlines across days, and a list showing the same
    // title three times reads as a bug even when the rows are distinct.
    const key = row.title.trim().toLowerCase();
    if (seen.has(key)) continue;
    if (!isTrustedSource(row.url)) continue;
    seen.add(key);

    notes.push({
      id: row.id,
      title: row.title,
      url: row.url,
      vendor: VENDOR[row.source_key] ?? 'Google Cloud',
      publishedAt: row.published_at,
    });
  }

  return { notes: notes.slice(0, limit), total: seen.size };
}
