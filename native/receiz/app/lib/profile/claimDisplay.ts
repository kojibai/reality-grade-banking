export type ReceizClaimDisplay = {
  displayText: string;
  firstLine: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  hasLocation: boolean;
};

const CLAIM_SEGMENT_SEPARATOR = /\s+·\s+/;
const CLAIM_LINK_SEGMENT = /^Link\s+(.+)$/i;
const CLAIM_TAGS_SEGMENT = /^Tags\s+(.+)$/i;
const CLAIM_LOCATION_SEGMENT = /^Location\s+(.+)$/i;
const LINK_ONLY_FALLBACK_TEXT = "Linked reference";
const LOCATION_ONLY_FALLBACK_TEXT = "Location attached";
const STRUCTURED_ONLY_FALLBACK_TEXT = "Recorded claim";

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function clampCaptionLine(value: string): string {
  if (value.length <= 96) return value;
  return `${value.slice(0, 95).trimEnd()}…`;
}

function normalizeHttpUrl(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const hasProtocol = /^https?:\/\//i.test(raw);
  const withProtocol = hasProtocol ? raw : `https://${raw}`;
  try {
    const protocol = new URL(withProtocol).protocol;
    if (protocol !== "http:" && protocol !== "https:") return null;
    return withProtocol;
  } catch {
    return null;
  }
}

function linkLabelFromHttpUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    const label = parsed.hostname.trim().replace(/\.$/, "").replace(/^www\./, "");
    return label || null;
  } catch {
    return null;
  }
}

export function firstClaimLine(value: string): string | null {
  const firstLine = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) return null;
  const compact = oneLine(firstLine);
  if (!compact) return null;
  return clampCaptionLine(compact);
}

export function parseReceizClaimDisplay(value: string): ReceizClaimDisplay {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const normalizedSegments: string[] = [];
  let linkedValue: string | null = null;
  let hasLocation = false;
  let hasHiddenTags = false;

  for (const line of lines) {
    const segments = line.split(CLAIM_SEGMENT_SEPARATOR).map((segment) => segment.trim()).filter(Boolean);
    const keptSegments: string[] = [];
    for (const segment of segments) {
      const matchedLink = segment.match(CLAIM_LINK_SEGMENT);
      if (matchedLink) {
        if (!linkedValue) linkedValue = oneLine(matchedLink[1] ?? "");
        continue;
      }
      if (CLAIM_TAGS_SEGMENT.test(segment)) {
        hasHiddenTags = true;
        continue;
      }
      if (CLAIM_LOCATION_SEGMENT.test(segment)) {
        hasLocation = true;
        continue;
      }
      keptSegments.push(segment);
    }
    if (keptSegments.length > 0) {
      normalizedSegments.push(keptSegments.join(" · "));
    }
  }

  const claimWithoutLink = normalizedSegments.join("\n").trim();
  const linkUrl = linkedValue ? normalizeHttpUrl(linkedValue) : null;
  const displayText =
    claimWithoutLink ||
    (linkUrl
      ? LINK_ONLY_FALLBACK_TEXT
      : hasLocation
        ? LOCATION_ONLY_FALLBACK_TEXT
        : hasHiddenTags
          ? STRUCTURED_ONLY_FALLBACK_TEXT
          : oneLine(value));

  return {
    displayText,
    firstLine: firstClaimLine(displayText),
    linkUrl,
    linkLabel: linkUrl ? linkLabelFromHttpUrl(linkUrl) : null,
    hasLocation,
  };
}
