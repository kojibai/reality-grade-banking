import type {ReactNode} from 'react';
import {ArrowLeft,ArrowUpRight} from 'lucide-react';
import {BankMark} from '../../components/BankMark';
import {InlineOpening} from '../../components/InlineOpening';
import './certificates.css';
/** The public shell stays mounted while the certificate body becomes ready. */
export function PublicCertificateShell({children}:{children:ReactNode}){
 return <main className="certificate-public-page"><header className="certificate-public-header"><a className="bank-home-mark" href="/" aria-label="Bankeiz home"><BankMark/></a><a className="text-button" href="/explore/"><ArrowLeft size={15}/>Explore</a></header>{children}<footer className="certificate-public-footer"><span><BankMark/>Reality-grade banking</span><a href="/standards/">The standard<ArrowUpRight size={12}/></a></footer></main>;
}
export function CertificateOpening({error='',onRetry}:{error?:string;onRetry?():void}){
 return <section><h1>Share certificate</h1><p className="body-copy" role="status">{error==='CERTIFICATE_NOT_FOUND'?'This certificate was not found. Check its complete purchase link.':error?'The certificate could not be reached. Its original and your account remain intact.':<InlineOpening label="Preparing the live share record"/>}</p>{error&&<button className="secondary-button" onClick={onRetry}>Try again</button>}</section>;
}
