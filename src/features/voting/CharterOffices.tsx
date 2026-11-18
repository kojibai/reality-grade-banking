import type {CharterArticle,CharterOffice} from '../../receiz/governance-documents';
type Props={offices:readonly CharterOffice[];articles:readonly CharterArticle[];setOffices:(value:CharterOffice[])=>void;setArticles:(value:CharterArticle[])=>void};
const newOffice:CharterOffice={name:'',seats:1,selection:'Election',eligibility:'Open',powers:'',term:'',recall:'',procedure:'Members each vote for one candidate. The highest counts fill the available seats. A tied seat requires another decision.'};
export function CharterOffices({offices,articles,setOffices,setArticles}:Props){
 function update(index:number,changes:Partial<CharterOffice>){setOffices(offices.map((o,i)=>i===index?{...o,...changes}:o));}
 return <>
   <section className="gov-stack"><h3>Offices and representation</h3><p>Leave offices empty for direct governance, or define the people who can act for the organization.</p>
     {offices.map((office,i)=><fieldset key={i} className="gov-box gov-form"><legend>{office.name||'New office'}</legend>
       <label>Office name<input required maxLength={120} value={office.name} onChange={e=>update(i,{name:e.target.value})}/></label>
       <div className="gov-fields"><label>Seats<input type="number" min={1} max={128} required value={office.seats} onChange={e=>update(i,{seats:Number(e.target.value)})}/></label>
       <label>Selection<select value={office.selection} onChange={e=>update(i,{selection:e.target.value as CharterOffice['selection']})}><option>Election</option><option value="Custom">Charter-defined procedure</option></select></label>
       <label>Who can stand<select value={office.eligibility} onChange={e=>update(i,{eligibility:e.target.value as CharterOffice['eligibility']})}><option value="Open">Any Receiz identity</option><option value="Electorate">Voting members</option></select></label></div>
       {([['powers','Duties and limits'],['term','Term and renewal'],['recall','Removal, vacancies and succession'],['procedure','Selection procedure and tie rules']] as const).map(([key,label])=><label key={key}>{label}<textarea required maxLength={4000} value={office[key]} onChange={e=>update(i,{[key]:e.target.value})}/></label>)}
       <button type="button" onClick={()=>setOffices(offices.filter((_,j)=>j!==i))}>Remove office</button>
     </fieldset>)}
     <button type="button" onClick={()=>setOffices([...offices,{...newOffice}])}>Add office</button>
   </section>
   <section className="gov-stack"><h3>Additional articles</h3><p>Add the rights, laws or procedures specific to this organization. Members can read every article before ratifying.</p>
     {articles.map((a,i)=><fieldset key={i} className="gov-box gov-form"><legend>Article {i+1}</legend>
       <label>Article title<input required maxLength={160} value={a.title} onChange={e=>setArticles(articles.map((v,j)=>j===i?{...v,title:e.target.value}:v))}/></label>
       <label>Full article<textarea required maxLength={16000} value={a.text} onChange={e=>setArticles(articles.map((v,j)=>j===i?{...v,text:e.target.value}:v))}/></label>
       <button type="button" onClick={()=>setArticles(articles.filter((_,j)=>j!==i))}>Remove article</button>
     </fieldset>)}
     <button type="button" onClick={()=>setArticles([...articles,{title:'',text:''}])}>Add article</button>
   </section>
 </>;
}
