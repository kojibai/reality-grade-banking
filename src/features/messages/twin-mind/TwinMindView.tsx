import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowUpRight,ChevronDown,Focus,Minus,Plus} from 'lucide-react';
import {buildTwinMindGraph,layoutTwinMind,type MindNode,type MindPoint} from '../../../receiz/twin-mind-graph';
import './twin-mind.css';
const record=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const text=(v:unknown)=>typeof v==='string'?v:'';
const colors={identity:'#dcebe9',source:'#cbbd89',user:'#92b5da',assistant:'#73c3ad'};
const day=(at:number|null)=>at===null?'Date not attached':new Date(at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
export default function TwinMindView({value,active=true}:{value:Record<string,unknown>;active?:boolean}){
 const graph=useMemo(()=>buildTwinMindGraph(value),[value]),[mode,setMode]=useState<'graph'|'continuity'>('graph'),[selected,setSelected]=useState<string>(),[zoom,setZoom]=useState(1),[section,setSection]=useState<'sources'|'memory'>('sources'),[limit,setLimit]=useState(20);
 const points=useMemo(()=>layoutTwinMind(graph,mode,selected),[graph,mode,selected]),canvas=useRef<HTMLCanvasElement>(null),[width,setWidth]=useState(0);
 const chosen=graph.nodes.find(n=>n.id===selected),focus=points.find(p=>p.node.id===selected),brain=record(value.proofBrain),owner=record(value.owner);
 useEffect(()=>{const node=canvas.current;if(!node||!active)return;const measure=()=>setWidth(Math.round(node.clientWidth));measure();const observer=typeof ResizeObserver==='function'?new ResizeObserver(measure):null;observer?.observe(node);return()=>observer?.disconnect();},[active]);
 useEffect(()=>{
  const node=canvas.current;if(!active||!node||!width)return;const ctx=node.getContext('2d');if(!ctx)return;
  const ratio=Math.min(2,window.devicePixelRatio||1),height=290;node.width=width*ratio;node.height=height*ratio;ctx.scale(ratio,ratio);ctx.clearRect(0,0,width,height);
  const positions=new Map(points.map(point=>[point.node.id,screenPoint(point,width,height,zoom,focus)]));
  for(const edge of graph.edges){const from=positions.get(edge.from),to=positions.get(edge.to);if(!from||!to)continue;
   const connected=selected===edge.from||selected===edge.to;ctx.strokeStyle=connected?'rgba(148,213,193,.62)':edge.kind==='conversation'?'rgba(121,180,185,.22)':'rgba(157,187,202,.06)';ctx.lineWidth=connected?1.1:.65;
   ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.quadraticCurveTo((from.x+to.x)/2,(from.y+to.y)/2-(mode==='graph'?Math.min(40,Math.abs(from.x-to.x)*.2):7),to.x,to.y);ctx.stroke();
  }
  for(const point of points){const p=positions.get(point.node.id)!;if(p.x<0||p.x>width||p.y<0||p.y>height)continue;
   const current=point.node.id===selected,radius=point.node.kind==='identity'?5:current?4:2.15;
   ctx.fillStyle=point.color??colors[point.node.kind];ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fill();
   if(current){ctx.strokeStyle='rgba(219,245,235,.65)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,9,0,Math.PI*2);ctx.stroke();}
  }
  // A single bounded canvas. No frame loop, simulation, media or private fetches.
 },[active,width,points,graph.edges,mode,zoom,selected,focus]);
 function pick(event:React.MouseEvent<HTMLCanvasElement>){const bounds=event.currentTarget.getBoundingClientRect(),x=event.clientX-bounds.left,y=event.clientY-bounds.top;let nearest:MindPoint|undefined,distance=22;
  for(const p of points){const position=screenPoint(p,width,290,zoom,focus),d=Math.hypot(position.x-x,position.y-y);if(d<distance){distance=d;nearest=p;}}if(nearest)setSelected(nearest.node.id);
 }
 const list=section==='sources'?graph.sources:graph.memory;
 return <section className="twin-mind-view" aria-label="Your Twin mind">
  <div className="twin-neural-card"><div className="twin-neural-bar"><span>YOUR CONTINUITY</span><div aria-label="Mind view">{(['graph','continuity'] as const).map(v=><button type="button" key={v} aria-pressed={mode===v} onClick={()=>{setMode(v);setZoom(1);}}>{v==='graph'?'Graph':'Continuity'}</button>)}</div></div>
   <div className="twin-neural-canvas"><div className="twin-neural-anchors"><button type="button" onClick={()=>{setSection('sources');setLimit(20);}}>{graph.sources.length} Sources</button><button type="button" onClick={()=>{setSelected('identity');}}>Your Receiz ID</button><button type="button" onClick={()=>{setSection('memory');setLimit(20);}}>{graph.memory.length} Memory turns</button></div><canvas ref={canvas} onClick={pick} role="img" aria-label={`${points.length} displayed records. Select a source or memory below for accessible details.`}/><div className="twin-neural-tools"><button type="button" aria-label="Zoom out of mind" disabled={zoom<=1} onClick={()=>setZoom(v=>Math.max(1,v-.5))}><Minus size={14}/></button><button type="button" aria-label="Fit mind" onClick={()=>setZoom(1)}><Focus size={14}/></button><button type="button" aria-label="Zoom into mind" disabled={zoom>=3} onClick={()=>setZoom(v=>Math.min(3,v+.5))}><Plus size={14}/></button></div></div>
   <div className="twin-neural-key"><span><i data-kind="source"/>Sources</span><span><i data-kind="user"/>Messages</span><span><i data-kind="assistant"/>Agent replies</span></div>

  </div>
  <p className="twin-mind-caption">{mode==='graph'?'Source membership and saved conversation order.':'Continuity follows the original carried Kai. Records without a sealed coordinate stay below.'}{graph.nodes.length>points.length&&` ${points.length} points shown; every record remains in the lists below.`}</p>
  {chosen&&chosen.kind==='identity'&&<div className="twin-mind-selection"><small>RECEIZ ID</small><h4>{chosen.label}</h4><p>Your Twin, source objects and saved conversations belong to this open account.</p>{text(brain.subjectHead)&&<code className="twin-mind-head">{text(brain.subjectHead)}</code>}</div>}{chosen&&chosen.kind!=='identity'&&<div className="twin-mind-selection" aria-live="polite"><small>{chosen.kind==='source'?'SOURCE RECORD':chosen.kind==='assistant'?chosen.label.toUpperCase():'MESSAGE'} · {day(chosen.at)}</small>{chosen.pulse&&<small>Original ☤KAI {chosen.pulse}</small>}<h4>{chosen.kind==='source'?chosen.label:chosen.kind==='assistant'?chosen.label+' replied.':'A conversation, kept.'}</h4><p className="twin-memory-text">{chosen.body||'Open the original for its full carried contents.'}</p><SourceLink node={chosen} username={text(owner.username)}/></div>}
  <div className="twin-mind-counts"><button type="button" aria-pressed={section==='sources'} onClick={()=>{setSection('sources');setLimit(20);}}><strong>{graph.sources.length.toLocaleString()}</strong><span>Sources</span></button><button type="button" aria-pressed={section==='memory'} onClick={()=>{setSection('memory');setLimit(20);}}><strong>{graph.memory.length.toLocaleString()}</strong><span>Memory turns</span></button></div>
  {list.length?<div className="twin-mind-list">{list.slice(0,limit).map(node=><button type="button" key={node.id} aria-pressed={node.id===selected} onClick={()=>setSelected(node.id)}><i data-kind={node.kind}/><span><strong>{node.kind==='source'?node.label:node.body||node.label}</strong><small>{node.kind==='source'?'Source record':node.label} · {day(node.at)}</small></span><ArrowUpRight size={13}/></button>)}{list.length>limit&&<button type="button" className="twin-text-link" onClick={()=>setLimit(v=>v+20)}>Show more<Plus size={13}/></button>}</div>:<p className="twin-muted">{section==='sources'?'Your available sources will appear here.':'Your saved conversations will appear here.'}</p>}
  {Object.keys(brain).length>0&&<details className="twin-source"><summary>Source continuity<ChevronDown size={14}/></summary>{Object.entries({subjectId:'Subject',subjectHead:'Subject head',showcaseHead:'Showcase head',historyHead:'History head',showcaseHeadKai:'Original Kai',objectMerkleRoot:'Object root',completeHistoryContentAddress:'Complete history'}).map(([key,label])=>brain[key]?<p key={key}><small>{label}</small><code>{text(brain[key])}</code></p>:null)}<p className="twin-muted">This view indexes your saved sources. The original proof objects carry their evidence.</p></details>}
 </section>;
}
function screenPoint(point:MindPoint,width:number,height:number,zoom:number,focus?:MindPoint){return{x:(point.x-(zoom>1?focus?.x??.5:.5))*width*zoom+width/2,y:(point.y-(zoom>1?focus?.y??.5:.5))*height*zoom+height/2};}
function SourceLink({node,username}:{node:MindNode;username:string}){
 const id=text(node.record.id),href=node.href??(!node.sourceKind&&node.kind==='source'&&id&&username?'/asset/'+encodeURIComponent('profile:'+username+':'+id)+'/':null);
 return href?<a className="twin-text-link" href={href}>{href.startsWith('/ledger/')?'View in Ledger':'Open original'}<ArrowUpRight size={13}/></a>:null;
}
