import {ArrowUpRight} from 'lucide-react';
import {noteContinuity} from '../content/note-continuity.mjs';

export function NoteContinuityStandard(){
 return <section id="note-continuity" className="note-standard" aria-labelledby="note-standard-title">
  <header><span className="note-standard-eyebrow">Technical standard · Receiz v129</span><h2 id="note-standard-title">One Note. Continuous proof.</h2><p>The same value, source and history. Exclusive consumption at every send.</p></header>
  <p className="note-standard-intro">Users create, receive, send and deposit. The underlying custody determines how a transfer is confirmed. This standard defines the required behavior; availability depends on the implemented and independently assessed path.</p>
  <div className="note-standard-paths">{noteContinuity.paths.map(path=><article key={path.id}><h3>{path.title}</h3><p>{path.body}</p></article>)}</div>
  <details className="note-standard-details"><summary>Consumption and continuity requirements</summary><p>Application integration requirements beneath the pinned Receiz registry. These descriptions do not grant proof authority.</p><dl>{noteContinuity.requirements.map(item=><div key={item.id}><dt><span className="note-standard-law">{item.id}</span>{item.title}</dt><dd>{item.body}</dd></div>)}</dl></details>
  <details className="note-standard-details"><summary>Integration responsibilities</summary><dl>{noteContinuity.integrators.map(item=><div key={item.title}><dt>{item.title}</dt><dd>{item.body}</dd></div>)}</dl><p>These are integration surfaces, not certified products. A platform label or browser capability report does not establish conformance. The actual adapter, trust policy, build and recovery behavior must be assessed.</p></details>
  <div className="note-standard-availability" data-note-execution-status={noteContinuity.connectedExecutionStatus}><h3>Current implementation</h3><p>{noteContinuity.connectedAvailability}</p></div>
  <details className="note-standard-details" data-note-accessory-status={noteContinuity.accessoryStatus}><summary>{noteContinuity.accessoryTitle}<span>Coming soon</span></summary><p>{noteContinuity.accessoryDescription}</p></details>
  <nav className="note-standard-links" aria-label="Note continuity resources"><a href="#device-evidence">Inspect this device’s evidence<ArrowUpRight size={15} aria-hidden="true"/></a><a href="https://github.com/kojibai/reality-grade-banking/blob/main/docs/note-continuity-standard.md">Read the full integration standard<ArrowUpRight size={15} aria-hidden="true"/></a></nav>
 </section>;
}
