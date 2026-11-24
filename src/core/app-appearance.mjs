export const APP_APPEARANCE_KEY = 'bankeiz.app.appearance';
export const APP_APPEARANCE_CHANGE = 'bankeiz:appearance';
export const APP_APPEARANCE_COLORS = Object.freeze({light:'#fcfbf8',dark:'#131e2c'});

/** Also runs as inline entry code before the first frame. Keep browser reads local. */
export function installAppAppearance(browser, key=APP_APPEARANCE_KEY, eventName=APP_APPEARANCE_CHANGE, colors=APP_APPEARANCE_COLORS, setAppearance=setAppAppearance){
 const root=browser.document.documentElement;
 const preference=browser.matchMedia('(prefers-color-scheme: dark)');
 function activeMode(){
  const selected=root.dataset.bankAppearance;
  return selected==='dark'||(!selected&&preference.matches)?'dark':'light';
 }
 function update(){
  const mode=activeMode();
  for(const meta of browser.document.querySelectorAll('meta[name="theme-color"]'))meta.content=colors[mode];
 }
 function restore(){
  let stored;
  try{stored=browser.localStorage.getItem(key);}catch{ /* System remains available. */ }
  if(stored==='light'||stored==='dark')root.dataset.bankAppearance=stored;
  else delete root.dataset.bankAppearance;
  update();
 }
 restore();
 if(browser.__bankeizAppearanceInstalled)return;
 browser.__bankeizAppearanceInstalled=true;
 browser.document.addEventListener('click',event=>{
  if(event.target?.closest?.('[data-bank-theme-toggle]'))setAppearance(activeMode()==='dark'?'light':'dark',browser,key,eventName);
 });
 root.dataset.bankAppearanceControl='';
 preference.addEventListener('change',update);
 browser.addEventListener(eventName,update);
 browser.addEventListener('storage',event=>{
  if(event.key===key||event.key===null){
   restore();
   browser.dispatchEvent(new browser.Event(eventName));
  }
 });
}

export function readAppAppearance(){
 const appearance=typeof document==='undefined'?null:document.documentElement.dataset.bankAppearance;
 return appearance==='light'||appearance==='dark'?appearance:'system';
}

export function setAppAppearance(mode,browser=window,key=APP_APPEARANCE_KEY,eventName=APP_APPEARANCE_CHANGE){
 if(mode!=='system'&&mode!=='light'&&mode!=='dark')return;
 const root=browser.document.documentElement;
 if(mode==='system')delete root.dataset.bankAppearance;
 else root.dataset.bankAppearance=mode;
 try{
  if(mode==='system')browser.localStorage.removeItem(key);
  else browser.localStorage.setItem(key,mode);
 }catch{ /* The current document can still use the selected mode. */ }
 browser.dispatchEvent(new browser.Event(eventName));
}

export function subscribeAppAppearance(subscriber){
 window.addEventListener(APP_APPEARANCE_CHANGE,subscriber);
 return ()=>window.removeEventListener(APP_APPEARANCE_CHANGE,subscriber);
}
