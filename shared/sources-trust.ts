/**
 * Which hosts may be turned into a link.
 *
 * The release-note feed is data, and data that becomes a tappable link is a
 * place where a poisoned row could send someone somewhere. An allowlist of
 * vendor documentation hosts is a smaller thing to get right than sanitising
 * arbitrary URLs, so only these are ever linked.
 */
/** Only these hosts are ever linked, so a poisoned row cannot become a link. */
const ALLOWED_HOSTS = [
  'cloud.google.com',
  'docs.cloud.google.com',
  'cloudblog.withgoogle.com',
  'aws.amazon.com',
  'docs.aws.amazon.com',
  'azure.microsoft.com',
  'learn.microsoft.com',
  'techcommunity.microsoft.com',
  'www.microsoft.com',
];

export function isTrustedSource(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    return ALLOWED_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

