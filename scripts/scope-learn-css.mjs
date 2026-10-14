import postcss from 'postcss';
export function scopeLearnCss(css) {
  const root = postcss.parse(css);
  root.walkRules(rule => {
    if (rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return;
    rule.selectors = rule.selectors.map(selector => {
      if (selector === ':root' || selector === 'html') return 'html.learn-surface';
      if (selector === 'body') return 'body[data-bank-surface="learn"]';
      if (/^\.(motion-ready|document-hidden)(?=[\s.:])/.test(selector)) return `html.learn-surface${selector}`;
      return `html.learn-surface ${selector}`;
    });
  });
  return root.toString();
}
