export const APP_APPEARANCE_KEY = 'bankeiz.app.appearance';
export const APP_APPEARANCE_CHANGE = 'bankeiz:appearance';
export const APP_APPEARANCE_COLORS = Object.freeze({light:'#fcfbf8',dark:'#131e2c'});

/** Also runs as inline entry code before the first frame. Keep browser reads local. */
export function installAppAppearance(browser, key=APP_APPEARANCE_KEY, eventName=APP_APPEARANCE_CHANGE, colors=APP_APPEARANCE_COLORS){
 const root=browser.document.documentElement;
 const preference=browser.matchMedia('(prefers-color-scheme: dark)');
 function update(){
  const selected=root.dataset.bankAppearance;
  const mode=selected==='dark'||(!selected&&preference.matches)?'dark':'light';
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

export function setAppAppearance(mode){
 if(mode!=='system'&&mode!=='light'&&mode!=='dark')return;
 const root=document.documentElement;
 if(mode==='system')delete root.dataset.bankAppearance;
 else root.dataset.bankAppearance=mode;
 try{
  if(mode==='system')localStorage.removeItem(APP_APPEARANCE_KEY);
  else localStorage.setItem(APP_APPEARANCE_KEY,mode);
 }catch{ /* The current document can still use the selected mode. */ }
 window.dispatchEvent(new Event(APP_APPEARANCE_CHANGE));
}

export function subscribeAppAppearance(subscriber){
 window.addEventListener(APP_APPEARANCE_CHANGE,subscriber);
 return ()=>window.removeEventListener(APP_APPEARANCE_CHANGE,subscriber);
}
