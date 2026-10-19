import postcss from 'postcss';
export function scopeLearnCss(css) {
  const root = postcss.parse(css);
  root.walkRules(rule => {
    if (rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return;
    // An empty selector would otherwise become `html.learn-surface`, leaking
    // an old footer's layout/decoration declarations onto the entire page.
    if (!rule.selector.trim() || rule.selectors.some(selector => !selector.trim())) throw new Error('LEARN_CSS_SELECTOR_REQUIRED');
    rule.selectors = rule.selectors.map(selector => {
      if (selector === ':root' || selector === 'html') return 'html.learn-surface';
      if (selector === 'body') return 'body[data-bank-surface="learn"]';
      if (/^\.(motion-ready|document-hidden|public-navigation-instant)(?=[\s.:])/.test(selector)) return `html.learn-surface${selector}`;
      return `html.learn-surface ${selector}`;
    });
  });
  return root.toString();
}
