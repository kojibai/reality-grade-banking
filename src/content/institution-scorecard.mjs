import coverage from '../conformance/coverage.json' with {type:'json'};
import certificate from './conformance-certificate.json' with {type:'json'};
import reference from './conformance-reference-status.json' with {type:'json'};
export {institutionScorecardPage} from './institution-scorecard-page.mjs';

// Reuse the published canonical Original and its recorded scope. The existing
// conformance-certificate build gate independently verifies this exact manifest,
// enclosing evidence, transcript, artwork and holder. Do not override its PASS
// with an absent report from a different assessment class.
export const bankeizRecordedConformance=Object.freeze({
 ...certificate,name:'Bankeiz',scope:'Public integration contract',
 referenceChecks:reference.checks.length,
 referencePassedCount:reference.checks.filter(check=>check.passed).length,
 referenceChecksPassed:reference.localChecksPassed&&reference.checks.every(check=>check.passed),
 referenceCompletedAt:reference.completedAt,
});

// A curated, build-time register of published conformance records and
// independently reviewed receiving evidence. This completeness check does not
// verify an assessment, admit money, or award financial authority. No
// caller-uploaded reports or browser state feed it.
export const scorecardPolicy=Object.freeze({
 updatedOn:'2026-11-05',
 scope:'Proof-native receiving and onward transfer',
});
const source='https://github.com/kojibai/reality-grade-banking/blob/main/';
export const continuityRequirements=Object.freeze([
 {id:'proof',title:'Receive money with its original proof',body:'Open and verify the complete Original and its funding sources. A payment notification, screenshot or balance entry cannot replace the money’s carried proof.',href:source+'institution/receiving-standard.md'},
 {id:'value',title:'Preserve the money exactly',body:'Keep the original denomination, exact units and funded composition. Credit the money exactly once, including after interruption.',href:source+'docs/conformance/independent-assessment-procedure.md'},
 {id:'ownership',title:'Keep ownership and provenance',body:'Bind the actual receiver and current owner to the admitted source. Preserve every required predecessor and reject stale or conflicting ownership.',href:source+'institution/receiving-standard.md'},
 {id:'history',title:'Keep the complete history intact',body:'Carry the original source and its causal history through receiving, storage, export and recovery. Reopening must independently establish the same history.',href:source+'docs/note-continuity-standard.md'},
 {id:'onward',title:'Pass the money and proof to the next receiver',body:'An onward transfer must preserve the money, ownership and history for independent verification by the next receiver. The evidence must survive beyond one institution’s interface.',href:source+'docs/conformance/independent-assessment-procedure.md'},
]);

// Organization links identify the subjects. They are not technical assessment
// evidence. A null assessment records the absence of a qualifying report in
// THIS register; it does not assert a bank-specific trial was performed.
// Country and region identify the institution's home market, not the full reach
// of its services. Names and home markets were checked against these official
// organization sites on 2026-11-05. Listing does not imply an application,
// affiliation, or an assessment beyond the evidence expressly recorded here.
export const institutionRecords=[
 {id:'chase',name:'Chase · JPMorgan Chase',website:'https://www.jpmorganchase.com/about',country:'United States',region:'North America',kind:'Banking institution',aliases:['JPMorganChase','JPMorgan Chase & Co.','J.P. Morgan'],assessment:null},
 {id:'wells-fargo',name:'Wells Fargo',website:'https://www.wellsfargo.com/about/',country:'United States',region:'North America',kind:'Banking institution',aliases:['Wells Fargo & Company'],assessment:null},
 {id:'bank-of-america',name:'Bank of America',website:'https://about.bankofamerica.com/en/our-company',country:'United States',region:'North America',kind:'Banking institution',aliases:['BofA','Bank of America Corporation'],assessment:null},
 {id:'citi',name:'Citi',website:'https://www.citigroup.com/global/about-us',country:'United States',region:'North America',kind:'Banking institution',aliases:['Citigroup','Citibank'],assessment:null},
 {id:'goldman-sachs',name:'Goldman Sachs',website:'https://www.goldmansachs.com/',country:'United States',region:'North America',kind:'Banking institution',aliases:['The Goldman Sachs Group'],assessment:null},
 {id:'hsbc',name:'HSBC',website:'https://www.hsbc.com/who-we-are',country:'United Kingdom',region:'Europe',kind:'Banking institution',aliases:['HSBC Holdings'],assessment:null},
 {id:'morgan-stanley',name:'Morgan Stanley',website:'https://www.morganstanley.com/about-us',country:'United States',region:'North America',kind:'Banking institution',assessment:null},
 {id:'ubs',name:'UBS',website:'https://www.ubs.com/global/en/our-firm.html',country:'Switzerland',region:'Europe',kind:'Banking institution',aliases:['UBS Group'],assessment:null},
 {id:'barclays',name:'Barclays',website:'https://home.barclays/',country:'United Kingdom',region:'Europe',kind:'Banking institution',aliases:['Barclays PLC'],assessment:null},
 {id:'deutsche-bank',name:'Deutsche Bank',website:'https://www.db.com/who-we-are/',country:'Germany',region:'Europe',kind:'Banking institution',aliases:['Deutsche Bank AG'],assessment:null},
 {id:'bnp-paribas',name:'BNP Paribas',website:'https://group.bnpparibas/en/group/about-us',country:'France',region:'Europe',kind:'Banking institution',assessment:null},
 {id:'santander',name:'Santander',website:'https://www.santander.com/en/about-us',country:'Spain',region:'Europe',kind:'Banking institution',aliases:['Banco Santander'],assessment:null},
 {id:'standard-chartered',name:'Standard Chartered',website:'https://www.sc.com/en/about/',country:'United Kingdom',region:'Europe',kind:'Banking institution',aliases:['Standard Chartered PLC'],assessment:null},
 {id:'rbc',name:'Royal Bank of Canada',website:'https://www.rbc.com/our-company/',country:'Canada',region:'North America',kind:'Banking institution',aliases:['RBC'],assessment:null},
 {id:'td-bank-group',name:'TD Bank Group',website:'https://www.td.com/ca/en/about-td/corporate-profile',country:'Canada',region:'North America',kind:'Banking institution',aliases:['Toronto-Dominion Bank','TD'],assessment:null},
 {id:'mufg',name:'MUFG',website:'https://www.mufg.jp/english/profile/overview/index.html',country:'Japan',region:'Asia Pacific',kind:'Banking institution',aliases:['Mitsubishi UFJ Financial Group'],assessment:null},
 {id:'icbc',name:'ICBC',website:'https://www.icbc-ltd.com/',country:'China',region:'Asia Pacific',kind:'Banking institution',aliases:['Industrial and Commercial Bank of China'],assessment:null},
 {id:'bny',name:'BNY',website:'https://www.bny.com/corporate/global/en/about-us/',country:'United States',region:'North America',kind:'Banking institution',aliases:['Bank of New York Mellon','BNY Mellon'],assessment:null},
 {id:'scotiabank',name:'Scotiabank',website:'https://www.scotiabank.com/ca/en/about.html',country:'Canada',region:'North America',kind:'Banking institution',aliases:['Bank of Nova Scotia'],assessment:null},
 {id:'bmo',name:'BMO',website:'https://www.bmo.com/en-ca/main/about-bmo/',country:'Canada',region:'North America',kind:'Banking institution',aliases:['Bank of Montreal','BMO Financial Group'],assessment:null},
 {id:'cibc',name:'CIBC',website:'https://www.cibc.com/en/about-cibc.html',country:'Canada',region:'North America',kind:'Banking institution',aliases:['Canadian Imperial Bank of Commerce'],assessment:null},
 {id:'lloyds-banking-group',name:'Lloyds Banking Group',website:'https://www.lloydsbankinggroup.com/who-we-are.html',country:'United Kingdom',region:'Europe',kind:'Banking institution',aliases:['Lloyds Bank','Bank of Scotland','Halifax'],assessment:null},
 {id:'natwest-group',name:'NatWest Group',website:'https://www.natwestgroup.com/who-we-are.html',country:'United Kingdom',region:'Europe',kind:'Banking institution',aliases:['NatWest','National Westminster Bank','Royal Bank of Scotland','RBS'],assessment:null},
 {id:'ing',name:'ING',website:'https://ing.com/about-us/ing-at-a-glance',country:'Netherlands',region:'Europe',kind:'Banking institution',aliases:['ING Group','ING Groep'],assessment:null},
 {id:'bbva',name:'BBVA',website:'https://www.bbva.com/en/corporate-information/',country:'Spain',region:'Europe',kind:'Banking institution',aliases:['Banco Bilbao Vizcaya Argentaria'],assessment:null},
 {id:'credit-agricole',name:'Crédit Agricole',website:'https://www.credit-agricole.com/',country:'France',region:'Europe',kind:'Banking institution',aliases:['Credit Agricole','Crédit Agricole Group'],assessment:null},
 {id:'mizuho',name:'Mizuho Financial Group',website:'https://www.mizuhogroup.com/who-we-are',country:'Japan',region:'Asia Pacific',kind:'Banking institution',aliases:['Mizuho','Mizuho Bank'],assessment:null},
 {id:'smbc-group',name:'SMBC Group',website:'https://www.smfg.co.jp/english/company/',country:'Japan',region:'Asia Pacific',kind:'Banking institution',aliases:['Sumitomo Mitsui Financial Group','SMFG','Sumitomo Mitsui Banking Corporation'],assessment:null},
 {id:'china-construction-bank',name:'China Construction Bank',website:'https://en.ccb.com/',country:'China',region:'Asia Pacific',kind:'Banking institution',aliases:['CCB'],assessment:null},
 {id:'bank-of-china',name:'Bank of China',website:'https://www.boc.cn/en/aboutboc/',country:'China',region:'Asia Pacific',kind:'Banking institution',aliases:['BOC'],assessment:null},
 {id:'dbs',name:'DBS',website:'https://www.dbs.com/',country:'Singapore',region:'Asia Pacific',kind:'Banking institution',aliases:['DBS Bank','DBS Group','Development Bank of Singapore','POSB'],assessment:null},
 {id:'ocbc',name:'OCBC',website:'https://www.ocbc.com/group/about-us/group-business',country:'Singapore',region:'Asia Pacific',kind:'Banking institution',aliases:['Oversea-Chinese Banking Corporation'],assessment:null},
 {id:'uob',name:'UOB',website:'https://www.uobgroup.com/uobgroup/about/index.page',country:'Singapore',region:'Asia Pacific',kind:'Banking institution',aliases:['United Overseas Bank'],assessment:null},
 {id:'commonwealth-bank',name:'Commonwealth Bank of Australia',website:'https://www.commbank.com.au/about-us.html',country:'Australia',region:'Asia Pacific',kind:'Banking institution',aliases:['CommBank','CBA'],assessment:null},
 {id:'nab',name:'National Australia Bank',website:'https://www.nab.com.au/about-us',country:'Australia',region:'Asia Pacific',kind:'Banking institution',aliases:['NAB'],assessment:null},
 {id:'anz',name:'ANZ',website:'https://www.anz.com.au/about-us/',country:'Australia',region:'Asia Pacific',kind:'Banking institution',aliases:['ANZ Group','Australia and New Zealand Banking Group'],assessment:null},
 {id:'hdfc-bank',name:'HDFC Bank',website:'https://www.hdfc.bank.in/about-us',country:'India',region:'Asia Pacific',kind:'Banking institution',assessment:null},
 {id:'state-bank-of-india',name:'State Bank of India',website:'https://sbi.bank.in/web/about-us/about-us',country:'India',region:'Asia Pacific',kind:'Banking institution',aliases:['SBI'],assessment:null},
 {id:'first-abu-dhabi-bank',name:'First Abu Dhabi Bank',website:'https://www.bankfab.com/en-ae/about-fab',country:'United Arab Emirates',region:'Middle East & Africa',kind:'Banking institution',aliases:['FAB'],assessment:null},
 {id:'emirates-nbd',name:'Emirates NBD',website:'https://www.emiratesnbd.com/en/about-emirates-nbd',country:'United Arab Emirates',region:'Middle East & Africa',kind:'Banking institution',aliases:['ENBD'],assessment:null},
 {id:'qnb',name:'QNB',website:'https://www.qnb.com/',country:'Qatar',region:'Middle East & Africa',kind:'Banking institution',aliases:['Qatar National Bank','QNB Group'],assessment:null},
 {id:'al-rajhi-bank',name:'Al Rajhi Bank',website:'https://www.alrajhibank.com.sa/en/about-alrajhi-bank',country:'Saudi Arabia',region:'Middle East & Africa',kind:'Banking institution',aliases:['alrajhi bank','Al Rajhi Banking & Investment Corporation'],assessment:null},
 {id:'standard-bank',name:'Standard Bank Group',website:'https://www.standardbank.com/sbg/standard-bank-group/our-group',country:'South Africa',region:'Middle East & Africa',kind:'Banking institution',aliases:['Standard Bank','Standard Bank of South Africa'],assessment:null},
 {id:'absa',name:'Absa Group',website:'https://www.absa.africa/about-us/',country:'South Africa',region:'Middle East & Africa',kind:'Banking institution',aliases:['Absa','Absa Group Limited'],assessment:null},
 {id:'access-bank',name:'Access Bank',website:'https://www.accessbankplc.com/about-us',country:'Nigeria',region:'Middle East & Africa',kind:'Banking institution',aliases:['Access Bank PLC'],assessment:null},
 {id:'itau-unibanco',name:'Itaú Unibanco',website:'https://www.itau.com.br/',country:'Brazil',region:'Latin America',kind:'Banking institution',aliases:['Itau Unibanco','Itaú','Itau'],assessment:null},
 {id:'bradesco',name:'Bradesco',website:'https://www.bradescori.com.br/en/',country:'Brazil',region:'Latin America',kind:'Banking institution',aliases:['Banco Bradesco'],assessment:null},
 {id:'banco-do-brasil',name:'Banco do Brasil',website:'https://ri.bb.com.br/en/',country:'Brazil',region:'Latin America',kind:'Banking institution',assessment:null},
 {id:'banorte',name:'Banorte',website:'https://investors.banorte.com/en',country:'Mexico',region:'Latin America',kind:'Banking institution',aliases:['Grupo Financiero Banorte','Banco Mercantil del Norte','GFNorte'],assessment:null},
 {id:'bancolombia',name:'Bancolombia',website:'https://www.grupobancolombia.com/corporate',country:'Colombia',region:'Latin America',kind:'Banking institution',aliases:['Grupo Bancolombia'],assessment:null},
 {id:'federal-reserve',name:'Federal Reserve System',website:'https://www.federalreserve.gov/aboutthefed.htm',country:'United States',region:'North America',kind:'Central bank',aliases:['Federal Reserve','The Fed','Fed','FRS'],assessment:null},
 {id:'european-central-bank',name:'European Central Bank',website:'https://www.ecb.europa.eu/',country:'Euro area',region:'Europe',kind:'Central bank',aliases:['ECB','BCE','EZB'],assessment:null},
 {id:'bank-of-england',name:'Bank of England',website:'https://www.bankofengland.co.uk/',country:'United Kingdom',region:'Europe',kind:'Central bank',aliases:['BoE'],assessment:null},
 {id:'bank-of-japan',name:'Bank of Japan',website:'https://www.boj.or.jp/en/',country:'Japan',region:'Asia Pacific',kind:'Central bank',aliases:['BoJ','Nippon Ginko','日本銀行'],assessment:null},
 {id:'swiss-national-bank',name:'Swiss National Bank',website:'https://www.snb.ch/en/',country:'Switzerland',region:'Europe',kind:'Central bank',aliases:['SNB','Schweizerische Nationalbank','Banque nationale suisse','Banca nazionale svizzera'],assessment:null},
 {id:'peoples-bank-of-china',name:'People’s Bank of China',website:'https://www.pbc.gov.cn/english/130437/index.html',country:'China',region:'Asia Pacific',kind:'Central bank',aliases:['PBOC',"People's Bank of China",'Peoples Bank of China','中国人民银行'],assessment:null},
 {id:'bank-of-canada',name:'Bank of Canada',website:'https://www.bankofcanada.ca/',country:'Canada',region:'North America',kind:'Central bank',aliases:['BoC','Banque du Canada'],assessment:null},
 {id:'reserve-bank-of-india',name:'Reserve Bank of India',website:'https://www.rbi.org.in/',country:'India',region:'Asia Pacific',kind:'Central bank',aliases:['RBI'],assessment:null},
 {id:'bank-for-international-settlements',name:'Bank for International Settlements',website:'https://www.bis.org/',country:'Switzerland',region:'Europe',kind:'International financial institution',aliases:['BIS','Bank for central banks'],assessment:null},
];

export const institutionDirectoryRecords=[
 {id:'bankeiz',name:'Bankeiz',website:'https://bankeiz.com/',country:'Global',region:'Global',kind:'Reference implementation',aliases:['Reality-Grade Banking reference implementation'],assessment:null,recordedConformance:bankeizRecordedConformance},
 ...institutionRecords,
];

const text=value=>typeof value==='string'&&value.trim().length>0;
const safeLink=value=>{
 if(!text(value))return false;
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}
};
const reviewDate=value=>{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value>scorecardPolicy.updatedOn)return false;
 const date=new Date(value+'T00:00:00Z');
 return !Number.isNaN(date.valueOf())&&date.toISOString().slice(0,10)===value;
};
const controlIds=coverage.requirements.map(requirement=>requirement.id);

export function institutionQualification(institution){
 const assessment=institution.assessment??null;
 const result=(basis,conformance,label,detail)=>({status:['reviewed-pass','recorded-conformance'].includes(basis)?'PASS':'FAIL',tone:['reviewed-pass','recorded-conformance'].includes(basis)?'green':'red',basis,conformance,label,detail,assessment});
 const published=institution.recordedConformance;
 if(published){
  // This only renders a curated, already-published certificate record. It never
  // admits runtime proof or replaces the real Original verification build gate.
  // The separately reported browser reference suite is not a new certificate
  // condition, nor is the independent receiving-assessment class below.
  const registryOriginal=/^[a-f0-9]{64}$/.test(published.artifactSha256??'')&&published.url===`/api/bank/registry/original/${institution.id}/${published.artifactSha256}`;
  const proofLink=registryOriginal||safeLink(published.url)||(text(published.url)&&/^\/conformance\/[a-z0-9][a-z0-9._/-]*$/i.test(published.url)&&!published.url.includes('..'));
  if(published.name!==institution.name)return result('incomplete-evidence','not-demonstrated','Conformance not demonstrated','The published conformance record identifies a different institution. Its PASS cannot be assigned to this entry.');
  if(published.recorded!==true||!text(published.name)||!text(published.scope)||!proofLink||!['artifactSha256','evidenceSha256','implementationBuildSha256'].every(key=>/^[a-f0-9]{64}$/.test(published[key]??''))||!text(published.holderReceizId)||!Number.isSafeInteger(published.cases)||published.cases<1)return result('incomplete-evidence','not-demonstrated','Conformance not demonstrated','The published certificate record is incomplete. Its recorded conformance cannot be displayed as PASS.');
  return {...result('recorded-conformance','conforming-for-assessed-capability','Conforming for the recorded scope',`The published Original records ${published.cases} passing conformance cases. PASS applies to the recorded ${published.scope} scope.${published.referenceChecks>0?' Separate reference checks are reported alongside that Original.':''}`),scope:published.scope,recordedConformance:published};
 }
 const incomplete=()=>result('incomplete-evidence','not-demonstrated','Conformance not demonstrated','The published assessment does not yet supply the complete reviewed receiving scope and required control evidence. The qualification gate remains FAIL.');
 if(!assessment)return result('missing-assessment','not-demonstrated','Conformance not demonstrated','No qualifying independent receiving assessment is recorded in this register. Required conformance evidence is missing, so the qualification gate remains FAIL.');
 const scope=assessment.scope;
 if(assessment.institutionId!==institution.id||!text(assessment.reviewer)||!reviewDate(assessment.reviewedOn)||!safeLink(assessment.reportUrl)||!scope||scope.capability!==scorecardPolicy.scope||!text(scope.adapter)||!text(scope.environment)||!/^[a-f0-9]{64}$/.test(scope.buildSha256??'')||!Array.isArray(scope.rails)||!scope.rails.includes('Settlement')||scope.rails.some(rail=>!['Reserve','Settlement','Composite'].includes(rail))||new Set(scope.rails).size!==scope.rails.length||!Array.isArray(assessment.previousReports)||!assessment.previousReports.every(safeLink))return incomplete();
 const controls=assessment.controls;
 if(!Array.isArray(controls)||!controls.length||controls.some(control=>!control||!controlIds.includes(control.id)||!['pass','fail','missing'].includes(control.status))||new Set(controls.map(control=>control.id)).size!==controls.length)return incomplete();
 if(controls.some(control=>control.status==='fail'&&Array.isArray(control.evidenceUrls)&&control.evidenceUrls.length&&control.evidenceUrls.every(safeLink)))return result('documented-failure','nonconforming-for-assessed-capability','Documented receiving failure','The reviewed assessment records a failed receiving requirement for the stated build, adapter, rail and environment. Correct it and publish a fresh independent assessment.');
 if(assessment.outcome!=='conforming'||controls.length!==controlIds.length||controls.some(control=>control.status!=='pass'||!Array.isArray(control.evidenceUrls)||!control.evidenceUrls.length||!control.evidenceUrls.every(safeLink)))return incomplete();
 return result('reviewed-pass','conforming-for-assessed-capability','Conforming for the assessed capability','Every required receiving control has supporting evidence in the independently reviewed assessment. PASS applies only to the published build, adapter, rail and environment.');
}
