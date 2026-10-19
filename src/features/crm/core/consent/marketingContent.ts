/**
 * Transactional messages (account, verification result, billing issue, booking confirmation)
 * need no marketing consent, so they must carry no marketing content. This check runs on every
 * transactional send and in the template editor, and blocks anything that looks promotional.
 *
 * It errs on the side of blocking: a false positive means Gus rewords a sentence; a false
 * negative means marketing goes to someone who never agreed to it.
 */

export interface MarketingContentFinding {
  kind: 'link' | 'phrase';
  match: string;
}

/** Links that only exist to sell: the in-app paywall and the (future) web checkout. */
export const PROMOTIONAL_LINK_PATTERNS: readonly RegExp[] = [/\/app\/paywall\b/i, /[?&]paywall\b/i, /\/join(?:\/|\?|$)/i, /\/upgrade\b/i];

/** Variables that render promotional links. Blocked in transactional templates. */
export const PROMOTIONAL_VARIABLES: readonly string[] = ['paywall_link', 'membership_link', 'web_join_link', 'referral_link'];

export const PROMOTIONAL_PHRASES: readonly RegExp[] = [
  /\bupgrade\b/i,
  /\bbecome a member\b/i,
  /\bjoin as a member\b/i,
  /\bkeep (?:your )?(?:full )?membership\b/i,
  /\bmembership offer\b/i,
  /\bspecial offer\b/i,
  /\blimited[- ]time\b/i,
  /\b\d{1,3}\s?% off\b/i,
  /\bdiscount\b/i,
  /\bdon[’']?t miss\b/i,
  /\bunlock\b/i,
  /\bpriority access\b/i,
  /\bcheaper tickets\b/i,
  /\brefer a friend\b/i,
  /\binvite (?:your|more) friends\b/i,
  /\bfree (?:first )?drink\b/i,
  /\bsubscribe now\b/i,
];

export function findMarketingContent(input: { texts: readonly (string | undefined)[]; links?: readonly string[] }): MarketingContentFinding[] {
  const findings: MarketingContentFinding[] = [];
  for (const link of input.links ?? []) {
    if (PROMOTIONAL_LINK_PATTERNS.some((p) => p.test(link))) findings.push({ kind: 'link', match: link });
  }
  const text = input.texts.filter(Boolean).join('\n');
  for (const variable of PROMOTIONAL_VARIABLES) {
    if (text.includes(`{${variable}}`)) findings.push({ kind: 'link', match: `{${variable}}` });
  }
  for (const phrase of PROMOTIONAL_PHRASES) {
    const m = phrase.exec(text);
    if (m) findings.push({ kind: 'phrase', match: m[0] });
  }
  // Also catch promotional links written inline in the text or HTML.
  for (const url of text.match(/https?:\/\/[^\s"'<>)]+/g) ?? []) {
    if (PROMOTIONAL_LINK_PATTERNS.some((p) => p.test(url)) && !findings.some((f) => f.match === url)) {
      findings.push({ kind: 'link', match: url });
    }
  }
  return findings;
}
