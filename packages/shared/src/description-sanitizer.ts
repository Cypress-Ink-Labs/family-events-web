/**
 * Cleans event descriptions ingested from WordPress / Divi-built sources.
 * These often contain raw `[et_pb_*]` shortcodes and HTML markup that
 * users would otherwise see verbatim. Conservative — preserves prose,
 * strips known noise.
 *
 * Mirrors `supabase/functions/_shared/parsing.ts#cleanDescription` for
 * ingest-time cleanup, and the iOS `FECore.DescriptionSanitizer`. Web
 * runs this on read for descriptions written before the ingest fix
 * landed.
 */

const HTML_ENTITIES: ReadonlyArray<readonly [string, string]> = [
  ["&nbsp;", " "],
  ["&amp;", "&"],
  ["&lt;", "<"],
  ["&gt;", ">"],
  ["&quot;", '"'],
  ["&#039;", "'"],
  ["&apos;", "'"],
  ["&hellip;", "…"],
  ["&ndash;", "–"],
  ["&mdash;", "—"],
  ["&rsquo;", "'"],
  ["&lsquo;", "'"],
  ["&rdquo;", '"'],
  ["&ldquo;", '"'],
];

export function stripDiviShortcodes(value: string): string {
  return (
    value
      .replace(/\[\/?et_pb_[a-z0-9_]*[^\]]*\]/gis, "")
      // Handle the truncated trailing case: ingest used to slice raw
      // description to 500 chars before cleaning, sometimes severing a
      // shortcode mid-attribute. The unclosed `[et_pb_image src="..."` that
      // survives in those rows has no `]` so the rule above never matches.
      .replace(/\[\/?et_pb_[a-z0-9_]*[^\]]*$/is, "")
  );
}

/**
 * Generic WP shortcodes. Lowercase-only name so user prose like
 * `[See more details]` survives.
 */
export function stripGenericShortcodes(value: string): string {
  return (
    value
      .replace(/\[\/?[a-z][a-z0-9_]*(?:\s[^\]]*)?\]/gs, "")
      // Trailing unclosed shortcode (truncation case). Require a space
      // after the name so we don't eat user prose like `[See details` that
      // happens to be at end-of-string.
      .replace(/\[\/?[a-z][a-z0-9_]*\s[^\]]*$/s, "")
  );
}

export function stripHtmlPreservingBreaks(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "");
}

export function decodeHtmlEntities(value: string): string {
  let out = value;
  for (const [entity, replacement] of HTML_ENTITIES) {
    out = out.split(entity).join(replacement);
  }
  return out;
}

export function collapseWhitespace(value: string): string {
  return value
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ");
}

/**
 * Returns null when the cleaned result is empty / whitespace-only,
 * so callers can hide the "About" section entirely.
 */
export function cleanDescription(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  let out = raw;
  out = stripDiviShortcodes(out);
  out = stripGenericShortcodes(out);
  out = stripHtmlPreservingBreaks(out);
  out = decodeHtmlEntities(out);
  out = collapseWhitespace(out);
  const trimmed = out.trim();
  return trimmed.length === 0 ? null : trimmed;
}
