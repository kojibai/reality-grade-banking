// Selected directory only. No identity, account requests or third-party code.
const mounted=new WeakSet();
const normalize=value=>value.toLowerCase().replace(/ies\b/g,'y');
export function init(){
 const root=document.querySelector('[data-fit-directory]');if(!root||mounted.has(root))return;mounted.add(root);
 const form=root.querySelector('form'),search=form.elements.q,group=form.elements.group,items=[...root.querySelectorAll('[data-fit]')];let goal='';
 const update=()=>{
  const terms=normalize(search.value.trim()).split(/\s+/).filter(Boolean);let count=0;
  for(const item of items){item.hidden=Boolean(group.value&&item.dataset.group!==group.value||goal&&item.dataset.goal!==goal||terms.some(term=>!normalize(item.dataset.search).includes(term)));if(!item.hidden)count++;}
  for(const section of root.querySelectorAll('[data-fit-group]'))section.hidden=![...section.querySelectorAll('[data-fit]')].some(item=>!item.hidden);
  root.querySelector('[data-fit-count]').textContent=`${count} ${count===1?'way':'ways'} to put it to work`;
  root.querySelector('[data-fit-empty]').hidden=count!==0;
  root.querySelectorAll('[data-fit-goal]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.fitGoal===goal)));
 };
 form.addEventListener('submit',event=>event.preventDefault());form.addEventListener('input',update);form.addEventListener('change',update);
 form.addEventListener('reset',event=>{event.preventDefault();search.value='';group.value='';goal='';update();});
 root.querySelectorAll('[data-fit-goal]').forEach(button=>button.addEventListener('click',()=>{goal=button.dataset.fitGoal;update();}));
}
