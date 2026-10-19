import { createRoot } from 'react-dom/client';
import { ConsoleShell } from '../../src/components/ConsoleShell';
import '../../src/styles/tokens.css';
import '../../src/styles/app.css';
import '../../src/styles/features.css';

// Interface-only fixture. The optional iframe creates a genuine narrow CSS
// viewport for browser environments whose outer viewport cannot be resized.
const width = new URLSearchParams(location.search).get('width');
if (width === '320' || width === '390') {
  const frame = document.createElement('iframe');
  frame.title = `${width}px Kai Klok viewport`; frame.src = location.pathname;
  frame.style.cssText = `display:block;width:${width}px;height:844px;border:0;margin:0 auto;background:#fcfbf8`;
  document.getElementById('root')!.append(frame);
} else {
  const noop = () => {};
  createRoot(document.getElementById('root')!).render(<ConsoleShell panel="ledger" onNavigate={noop} onProfile={noop} onDeposit={noop}><h1 className="page-title">Ledger</h1><p className="page-subtitle">Every movement keeps its story.</p><p className="body-copy small-copy">Header preview · no account or money connected.</p></ConsoleShell>);
}
