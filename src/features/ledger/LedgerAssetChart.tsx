import {useMemo} from 'react';
import {PublicAssetChart} from '../market/PublicAssetChart';
import {ledgerAssetPeriods} from '../../receiz/ledger-asset-history';
import type {PublicRecord} from '../../receiz/public-network';
import type {LedgerValueIndex} from '../../receiz/ledger-value';
export function LedgerAssetChart({record,valueSource}:{record:PublicRecord;valueSource:LedgerValueIndex|null}){
 const periods=useMemo(()=>ledgerAssetPeriods(record,valueSource),[record,valueSource]);
 return periods?<section className="ledger-asset-chart" aria-label="Object value history"><h4>Value history</h4><PublicAssetChart periods={periods}/></section>:null;
}
