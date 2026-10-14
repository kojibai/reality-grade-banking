export function normalizeSignerEnvText(value) {
  let result = typeof value === 'string' ? value.trim() : '';
  if ((result.startsWith('"') && result.endsWith('"')) || (result.startsWith("'") && result.endsWith("'"))) result = result.slice(1, -1).trim();
  return result;
}
// Provider configuration only. The returned value is private and must never
// enter logs, arguments, files or chat. Preserve ignored old representation.
export function prepareSignerBearerRepair(sourceBearer, original) {
  const bearer = normalizeSignerEnvText(sourceBearer);
  if (!bearer || bearer.length > 4096 || /\s/.test(bearer)) throw new Error('SOURCE_BEARER_INVALID');
  let entries;
  try {
    let parsed = JSON.parse(normalizeSignerEnvText(original));
    if (typeof parsed === 'string') parsed = JSON.parse(parsed.trim());
    entries = Array.isArray(parsed) ? structuredClone(parsed) : null;
  } catch { entries = null; }
  if (!entries) entries = [{ previousUnusableConfiguration: original }];
  if (entries.length > 128) throw new Error('TARGET_BEARER_REVIEW_REQUIRED');
  if (!entries.some(item => typeof item === 'string' && item.trim() === bearer)) entries.push(bearer);
  return { entries, value: JSON.stringify(entries) };
}
