import {createRoot} from 'react-dom/client';
import {InvoicePage} from './InvoicePage';
import '../styles/tokens.css';
import '../components/form-controls.css';
import './invoice.css';
const host=document.querySelector<HTMLElement>('[data-invoice-root]')!;
const root=createRoot(host);
function render(){root.render(<InvoicePage key={location.href} href={location.href}/>);}
render();addEventListener('hashchange',render);addEventListener('popstate',render);
