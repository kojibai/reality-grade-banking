import './profile-footer.css';
import {BankMark} from '../components/BankMark';
/** One restrained finish shared by the carried document and live profile. */
export function ProfileFooter({navigationLabel='Profile footer',resource='discover'}:{navigationLabel?:string;resource?:'discover'|'conformance'}={}){
 return <footer className="profile-footer"><a className="profile-footer-signature" href="/" aria-label="Bankeiz home"><BankMark/><span>Money that shows its work.</span></a><nav aria-label={navigationLabel}>{resource==='conformance'?<a href="/conformance/">Conformance</a>:<a href="/discover/">Discover</a>}<a href="/standards/">Standard</a><a href="/legal/">Legal</a></nav></footer>;
}
