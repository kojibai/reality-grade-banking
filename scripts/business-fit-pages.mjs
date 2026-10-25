import {learnHeader} from './learn-template.mjs';
import {siteFooterHtml} from './site-footer.mjs';
import {businessFits,fitGroups,fitGoals} from '../src/content/business-fits.mjs';
import {businessScene} from './business-scene.mjs';
import {businessCheckout,businessPriceCard,businessIncluded,businessBanking,businessFaq,businessMobileAction} from './business-page.mjs';
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const arrow='<span aria-hidden="true">↗</span>';
const fitPath=fit=>`/business/for/${fit.slug}/`;
export function directoryContent(){return `${learnHeader()}<main id="main" class="business-page fit-directory" data-fit-directory>
 <section class="learn-shell fit-directory-hero"><h1>Find the part that<br>changes your day.</h1><div><p>You know what keeps slowing you down. Start there.</p><p>Find your work, see what becomes possible, and make the next move with one Business subscription.</p><a class="business-text-link" href="/business/">See everything in Business — $149/month ${arrow}</a></div></section>
 <div class="learn-shell">${businessScene('create',['The work on your desk','Pick up where you left off','The next step, ready to review'],{eager:true})}</div>
 <section class="learn-shell fit-directory-results" aria-labelledby="fit-directory-title"><h2 id="fit-directory-title">What would make the biggest difference?</h2><p class="fit-directory-note">Start with a result, or explore all ${businessFits.length} ways to put it to work.</p>
 <div class="fit-goals" role="group" aria-label="Choose a result"><button type="button" data-fit-goal="" aria-pressed="true">All results</button>${fitGoals.map(goal=>`<button type="button" data-fit-goal="${goal.id}" aria-pressed="false">${esc(goal.label)}</button>`).join('')}</div>
 <form class="fit-search" role="search"><label><span>Find your work or goal</span><input type="search" name="q" placeholder="Try agency, creator, client questions…" aria-label="Find your work or goal" autocomplete="off"></label><label><span>Area of work</span><select name="group" aria-label="Area of work"><option value="">All areas</option>${fitGroups.map(group=>`<option value="${group.id}">${esc(group.label)}</option>`).join('')}</select></label><button type="reset">Clear filters</button></form>
 <p class="fit-count" role="status" aria-live="polite" data-fit-count>${businessFits.length} ways to put it to work</p>
 <div class="fit-list">${fitGroups.map(group=>`<section class="fit-group" data-fit-group><h3>${esc(group.label)}</h3><div>${businessFits.filter(fit=>fit.group===group.id).map(fit=>`<a data-fit data-group="${fit.group}" data-goal="${fit.story}" data-search="${esc([fit.label,fit.headline,fit.description,fit.pain].join(' ').toLowerCase())}" href="${fitPath(fit)}"><span class="fit-label">${esc(fit.label)}</span><h4>${esc(fit.headline)}</h4><p>${esc(fit.benefits[0][1])}</p>${arrow}</a>`).join('')}</div></section>`).join('')}</div>
 <p class="fit-empty" hidden data-fit-empty>No exact match yet. Try a broader word or clear the filters to explore the full directory.</p>
 </section>${businessBanking()}<section class="learn-shell business-close"><h2>Your work may fit<br>more than one page.</h2><p>It is one subscription. Bring the combination that makes sense for you.</p>${businessCheckout()}<p>$149/month · Renews until cancelled.</p></section>
 </main>${businessMobileAction()}${siteFooterHtml('/fit/')}`;}
export function fitContent(fit){
 const related=businessFits.filter(other=>other.slug!==fit.slug&&other.group===fit.group).slice(0,3);
 return `${learnHeader()}<main id="main" class="business-page fit-page">
 <section class="learn-shell business-hero fit-hero"><div class="business-intro"><a class="fit-back" href="/fit/">All ways to use Business ${arrow}</a><span class="fit-label">${esc(fit.label)}</span><h1>${esc(fit.headline)}</h1><p>${esc(fit.pain)}</p><a class="business-text-link" href="#your-work">See it in your work ${arrow}</a></div>${businessPriceCard(fit.benefits.map(([outcome])=>outcome))}</section>
 <section class="learn-shell fit-visual" aria-label="Business for ${esc(fit.label)}">${businessScene(fit.story,fit.visualLabels,{eager:true})}</section>
 <section id="your-work" class="learn-shell fit-story"><div><h2>Start with a real<br>piece of your work.</h2><p>${esc(fit.scenario)}</p></div><div class="fit-question"><p>One useful place to begin</p><blockquote>“${esc(fit.question)}”</blockquote><span>Bring the context. Work through the answer. Keep the final say.</span></div></section>
 <section class="learn-shell fit-outcomes"><h2>What changes in your day.</h2><div>${fit.benefits.map(([title,copy],index)=>`<article><span>0${index+1}</span><h3>${esc(title)}</h3><p>${esc(copy)}</p></article>`).join('')}</div></section>
 <section class="learn-shell business-workflow"><h2>Your first useful session.</h2><ol>${fit.steps.map((step,index)=>`<li><span aria-hidden="true">0${index+1}</span><p>${esc(step)}</p></li>`).join('')}</ol><p class="business-context-note">Work from the information and permissions you provide. Review generated material and consequential proposals before using their supported actions.</p></section>
 ${businessIncluded(fit.description)}${businessBanking()}${businessFaq()}
 <section class="learn-shell fit-related"><h2>More of your work?</h2><nav>${related.map(other=>`<a href="${fitPath(other)}">${esc(other.label)} ${arrow}</a>`).join('')}<a href="/fit/">Explore every fit ${arrow}</a><a href="/business/">The complete offer ${arrow}</a></nav></section>
 <section class="learn-shell business-close fit-close"><h2>${esc(fit.benefits[0][0])}</h2>${businessCheckout()}<p>$149/month · Renews until cancelled.<br>Annual option: $1,499/year, renewing until cancelled.</p></section>
 </main>${businessMobileAction()}${siteFooterHtml(fitPath(fit))}`;
}
