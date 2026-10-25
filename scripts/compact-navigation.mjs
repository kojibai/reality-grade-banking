/** Carry identical page styles once. Heads expand only when their page is used;
 * the initial HTML and every destination keep their exact original CSS. */
export function compactNavigation(input) {
  const styles = [], indices = new Map();
  const head = value => {
    const parts = value.split(/(<style\b[^>]*>[\s\S]*?<\/style>)/gi);
    if (parts.length === 1) return value;
    return parts.map((part, index) => {
      if (index % 2 === 0) return part;
      let reference = indices.get(part);
      if (reference === undefined) { reference = styles.length; indices.set(part, reference); styles.push(part); }
      return reference;
    });
  };
  const page = value => ({ ...value, head: head(value.head) });
  return { ...input, pages: Object.fromEntries(Object.entries(input.pages).map(([path, value]) => [path, page(value)])), bank: page(input.bank), styles };
}
