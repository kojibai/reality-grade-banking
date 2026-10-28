import {CHAKRA_BASE_FREQ,normalizeChakraDayKey} from "../../components/KaiSigil/constants";
import {deriveFrequencyHzSafe} from "../../components/KaiSigil/freq";
import type {ChakraDayKey,WeekdayName} from "../../components/KaiSigil/types";

/** The original KaiSigil mint's existing frequency rule. No clock or I/O. */
export function sigilFrequencyFromMoment(moment:{chakraDay?:string|null;stepIndex:number}|null):number|undefined {
 if(!moment||!Number.isInteger(moment.stepIndex)||moment.stepIndex<0||moment.stepIndex>=44||typeof moment.chakraDay!=="string")return;
 const chakra=normalizeChakraDayKey(moment.chakraDay as ChakraDayKey|WeekdayName);
 if(!Object.hasOwn(CHAKRA_BASE_FREQ,chakra))return;
 return deriveFrequencyHzSafe(chakra,moment.stepIndex);
}
