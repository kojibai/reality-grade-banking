import {governanceGuideRecords as record} from '../src/content/governance-guide.mjs';

export function governanceGuideContent(page,header,footer,arrow,escape){
 const sections=page.sections.map(([title,copy])=>[escape(title),escape(copy)]);
 const [charter,proposal,ballot]=sections;
 const entry='<a class="learn-button button-cobalt" href="/vote/">Open voting '+arrow+'</a>';
 const source=(href,label)=>'<a href="'+href+'">'+label+' '+arrow+'</a>';
 return header+`<main id="main" class="governance-guide">
  <section class="gg-intro learn-shell"><div class="gg-lead"><p class="section-intro">Governance</p><h1>How a group<br>makes a decision.</h1><p>A charter sets the rules. Members propose a change, cast public ballots and keep a signed record they can check for themselves.</p><div class="hero-actions">${entry}<a class="text-action" href="#how-governance-works">How it works</a></div></div>
   <aside class="gg-case" aria-labelledby="gg-motion"><div class="gg-case-label"><span>Receiz charter</span><span>First amendment</span></div><div class="gg-mark"><img src="/vote/receiz.svg" width="58" height="58" alt="Proposed Receiz R on white"></div><h2 id="gg-motion">Adopt the Receiz R on white as the charter logo</h2><p>Submitted by @bjklock</p>${source(record.amendment,'Inspect the proposal')}</aside>
  </section>
  <section id="how-governance-works" class="gg-section learn-shell"><h2>How a vote works</h2><div class="gg-steps">${[[charter,record.receiz,'Read the Receiz charter'],[proposal,record.amendment,'See the proposed change'],[ballot,'/vote/','Find a vote']].map(([[title,copy],href,label])=>`<article><h3>${title}</h3><p>${copy}</p>${source(href,label)}</article>`).join('')}</div></section>
  <section class="gg-proof"><div class="learn-shell gg-depth"><div><p class="section-intro">Method, sources and assessment</p><h2>What can you verify?</h2><p>Two people holding the same Originals can check the same decision, even if they received their copies from different places.</p>${source(record.ratification,'Inspect the founder’s ratification')}</div><div class="gg-disclosures">${sections.slice(3).map(([title,copy],i)=>`<details${i===0?' open':''}><summary>${title}</summary><p>${copy}</p></details>`).join('')}
  <details><summary>Representatives and treasury powers</summary><p>A charter can define offices, terms, recalls and scoped voting mandates. A binding appointment needs its election evidence. A treasury decision needs a specific budget, recipient and authorization, followed by a settlement receipt. The public record lets members check each step separately.</p></details></div></div></section>
  <section class="gg-close learn-shell"><div><h2>Open the public register</h2><p>Read a charter, inspect its decisions or start an organization of your own.</p><nav aria-label="Founding charters">${source(record.receiz,'Receiz charter')}${source(record.bankeiz,'Bankeiz charter')}</nav></div>${entry}</section>
 </main>`+footer;
}
