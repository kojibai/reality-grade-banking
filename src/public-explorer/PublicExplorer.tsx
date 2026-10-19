import {SiteFooter} from '../components/SiteFooter';
import {BankMark} from '../components/BankMark';
import {KaiKlok} from '../components/KaiKlok';
import {Market} from '../features/market/Market';
import './explorer.css';
/** A separate public entry: never opens device identity or private account custody. */
export function PublicExplorer(){
 return <div className="console public-explorer"><a className="explorer-skip" href="#explorer-main">Skip to explorer</a><header className="app-header"><a className="bank-home-mark" href="/" aria-label="Bankeiz home"><BankMark/></a><KaiKlok/><div className="header-tools"><a className="avatar explorer-account" href="/" aria-label="Open your account">ID</a></div></header><main className="main-panel" id="explorer-main"><Market mode="explorer"/><SiteFooter/></main></div>;
}
