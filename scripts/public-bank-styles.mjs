/** Only private Bank styles are suspended while a public surface is visible.
 * The emitted Host and its static component dependencies also style public
 * purchases, including when their JavaScript is already in the module cache. */
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
  return styles.filter(url => !shared.has(url));
}
