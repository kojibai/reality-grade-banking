// Local reading search only. The complete directory remains in the document.
const mounted=new WeakSet();
const normalize=value=>value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ');
const filler=new Set('how what do does can could is are i my a an the to by with please for from in on your our want need where show find'.split(' '));
export function init(){
 const root=document.querySelector('[data-guide-directory]');if(!root||mounted.has(root))return;mounted.add(root);
 const form=root.querySelector('[data-guide-search]'),search=form.elements.q;
 const items=[...root.querySelectorAll('[data-guide-card]')].map(link=>({link,text:normalize(link.dataset.search),href:link.getAttribute('href')}));
 const groups=[...root.querySelectorAll('[data-guide-group]')],subjects=[...root.querySelectorAll('[data-guide-subject]')];
 const update=()=>{
  const terms=normalize(search.value).split(' ').filter(term=>term&&!filler.has(term));let count=0;
  for(const {link,text,href} of items){link.hidden=terms.some(term=>!text.includes(term));if(!link.hidden)count++;link.setAttribute('href',terms.includes('email')&&link.dataset.guideTarget?link.dataset.guideTarget:href);}
  for(const group of groups)group.hidden=![...group.querySelectorAll('[data-guide-card]')].some(link=>!link.hidden);
  for(const link of subjects)link.hidden=groups.find(group=>group.id===link.dataset.guideSubject)?.hidden??false;
  root.querySelector('[data-guide-count]').textContent=`${count} ${count===1?'guide':'guides'}`;
  root.querySelector('[data-guide-empty]').hidden=count!==0;
 };
 form.addEventListener('submit',event=>event.preventDefault());form.addEventListener('input',update);
 form.addEventListener('reset',event=>{event.preventDefault();search.value='';update();search.focus();});
 update();search.disabled=false;form.querySelector('button[type="reset"]').disabled=false;
}
