import {useEffect,useRef,useState} from 'react';
import {Check,Link2,Share2,X} from 'lucide-react';
import {useCopyFeedback} from '../../components/CopyFeedback';
import {governancePath} from '../../receiz/governance-links';
import {governanceCard,governanceCardImage} from '../../receiz/governance-share';
import type {GovernanceRow} from '../../receiz/governance-directory';

export function GovernanceLink({row,path:customPath}:{row:GovernanceRow;path?:string}){
  const kind=row.document.terms.kind,path=customPath??governancePath(kind,row.digest);
  const url=new URL(path,location.origin).href,card=governanceCard(row);
  const {copied,confirm}=useCopyFeedback(path),[manual,setManual]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{if(manual)dialog.current?.showModal?.();},[manual]);
  async function copy(){
    try{await navigator.clipboard.writeText(url);confirm();}
    catch{setManual(true);}
  }
  async function share(){
    if(navigator.share){try{await navigator.share({title:card.title,url});return;}catch(e){if(e instanceof Error&&e.name==='AbortError')return;}}
    setManual(true);
  }
  return <div className="gov-share-actions"><button type="button" className="gov-icon" aria-label={copied?'Link copied':'Copy '+kind+' link'} title={copied?'Copied':'Copy link'} onClick={()=>void copy()}>{copied?<Check size={17}/>:<Link2 size={17}/>}</button>
    <button type="button" className="gov-icon" aria-label={'Share '+kind} title="Share" onClick={()=>void share()}><Share2 size={17}/></button>
    {manual&&<dialog className="gov-share-dialog" ref={dialog} aria-label={'Share '+kind} onClose={()=>setManual(false)}>
      <div className="gov-detail-title"><h3>Share {kind}</h3><button className="gov-icon" aria-label="Close share preview" onClick={()=>{dialog.current?.close();setManual(false);}}><X size={16}/></button></div>
      <img src={governanceCardImage(path,row.digest)} alt={card.title} width="1200" height="630"/><label>Link<input readOnly value={url} onFocus={e=>e.target.select()}/></label>
      <div className="gov-actions"><button onClick={()=>void copy()}><Link2 size={15}/>{copied?'Copied':'Copy link'}</button><a href={governanceCardImage(path,row.digest)} download={'governance-'+row.digest.slice(0,12)+'.png'}>Save image</a></div>
    </dialog>}</div>;
}
