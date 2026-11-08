/** Only private Bank styles are suspended while a public surface is visible.
 * The emitted Host and its static component dependencies also style public
 * purchases and profile creation, including with cached JavaScript. */
export function bankOwnedStyles(styles, manifest) {
  const chunks = Object.entries(manifest).filter(([, chunk]) => chunk?.name === 'PublicAssetTradeHost' && typeof chunk.file === 'string' && chunk.file.endsWith('.js'));
  if (chunks.length !== 1) throw Error('PUBLIC_TRADE_STYLE_ENTRY_INVALID');
  const shared = new Set(), visited = new Set();
  const visit = key => {
    if (visited.has(key)) return;
    const chunk = manifest[key];
    if (!chunk || typeof chunk !== 'object') throw Error('PUBLIC_TRADE_STYLE_IMPORT_INVALID');
    visited.add(key);
    for (const css of chunk.css ?? []) {
      if (typeof css !== 'string' || !/^assets\/[\w.-]+\.css$/.test(css)) throw Error('PUBLIC_TRADE_STYLESHEET_INVALID');
      shared.add('/' + css);
    }
    // A later private lazy feature is not part of this component's ownership.
    for (const dependency of chunk.imports ?? []) visit(dependency);
  };
  visit(chunks[0][0]);
  // The profile portals the existing creator outside the hidden Bank root.
  // Its canonical frame owns these styles on both surfaces; never suspend
  // them as private Bank CSS when an already-loaded profile opens the editor.
  for (const [key, chunk] of Object.entries(manifest)) if (chunk?.name === 'AssetCreationSheet' && typeof chunk.file === 'string' && chunk.file.endsWith('.js')) visit(key);
  return styles.filter(url => !shared.has(url));
}
