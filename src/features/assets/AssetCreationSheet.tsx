import type {ReactNode} from 'react';
import {Sheet} from '../../components/Sheet';
import './moment-composer.css';
import './asset-composer.css';
import './asset-studio.css';
import './asset-creation-studio.css';

/** Both entrances own the same editor frame and its public-safe styles. */
export function AssetCreationSheet({children,active=true,onClose}:{children:ReactNode;active?:boolean;onClose():void}){
 return <Sheet title="New original" className="sheet--asset-studio" active={active} onClose={onClose}>{children}</Sheet>;
}
