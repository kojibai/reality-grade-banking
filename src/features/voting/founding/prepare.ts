import {prepareProfileImage} from '../../../receiz/profile-image';
import {businessContextHash} from '../../../receiz/business-document-context';
import {constitutionEdition,foundingRules,type FoundingOrganization} from './charters';
const receizLogo='/vote/receiz.svg';

export async function prepareFoundingDraft(name:FoundingOrganization){
 const read=async(url:string)=>{
  const response=await fetch(url);
  if(!response.ok)throw Error('The founding document could not be opened.');
  return response.blob();
 };
 const [art,pdf]=await Promise.all([read(name==='Bankeiz'?'/icon-192.png':receizLogo),read('/vote/constitution-zero/Constitution-Zero.pdf')]);
 if(await businessContextHash(new Uint8Array(await pdf.arrayBuffer()))!==constitutionEdition.pdfSha256)throw Error('The Constitution edition differs from the selected source.');
 const logoFile=await prepareProfileImage(new File([art],'logo',{type:art.type}),'logo');
 const logo=await new Promise<string>((resolve,reject)=>{
  const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('The charter logo could not be opened.'));reader.readAsDataURL(logoFile);
 });
 return {name,rules:foundingRules(name),logo,file:new File([pdf],'Constitution-Zero.pdf',{type:'application/pdf'})};
}
export type FoundingDraft=Awaited<ReturnType<typeof prepareFoundingDraft>>;
