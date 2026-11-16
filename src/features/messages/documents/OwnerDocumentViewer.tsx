import {Sheet} from '../../../components/Sheet';
import type {BusinessDocumentDraft} from '../../../receiz/business-document';
import {DocumentFilePreview,DocumentTermsView,saveDocumentFile} from './DocumentTermsView';
import './documents.css';

export function OwnerDocumentViewer({view,onClose,onShare}:{view:{original:File;payload:File;draft:BusinessDocumentDraft};onClose():void;onShare?():void}){
 return <Sheet title={view.draft.title} onClose={onClose} className="bank-document-sheet"><DocumentTermsView draft={view.draft}/>{onShare&&<button type="button" className="secondary-button" onClick={onShare}>Review sharing to main thread</button>}<DocumentFilePreview file={view.payload}/><details className="bank-document-evidence"><summary>Original</summary><button type="button" onClick={()=>saveDocumentFile(view.original)}>Download Original</button></details></Sheet>;
}
