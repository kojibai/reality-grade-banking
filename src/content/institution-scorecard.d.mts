export interface ReviewedAssessment {
 institutionId:string;reviewer:string;reviewedOn:string;reportUrl:string;
 outcome:'conforming'|'nonconforming';previousReports:string[];
 scope:{capability:string;buildSha256:string;environment:string;adapter:string;rails:string[]};
 controls:{id:string;status:'pass'|'fail'|'missing';evidenceUrls:string[]}[];
}
export interface PublishedConformanceRecord {
 readonly recorded:boolean;readonly name:string;readonly scope:string;readonly url:string;
 readonly cases:number;readonly artifactSha256:string;readonly evidenceSha256:string;
 readonly holderReceizId:string;readonly implementationBuildSha256:string;
 readonly referenceChecks:number;readonly referencePassedCount:number;readonly referenceChecksPassed:boolean;readonly referenceCompletedAt:string;
}
export interface InstitutionRecord {
 id:string;name:string;website:string;assessment:ReviewedAssessment|null;
 aliases?:string[];country?:string;region?:string;kind?:string;recordedConformance?:PublishedConformanceRecord;
}
export interface InstitutionQualification {
 status:'FAIL'|'PASS';tone:'red'|'green';
 basis:'missing-assessment'|'incomplete-evidence'|'documented-failure'|'reviewed-pass'|'recorded-conformance';
 conformance:'not-demonstrated'|'nonconforming-for-assessed-capability'|'conforming-for-assessed-capability';
 label:string;detail:string;assessment:ReviewedAssessment|null;scope?:string;recordedConformance?:PublishedConformanceRecord;
}
export const scorecardPolicy:Readonly<{updatedOn:string;scope:string}>;
export const institutionScorecardPage:{slug:string;path:string;group:string;title:string;description:string;intro:string;visual:string;sections:[string,string][];related:string[];institutionScorecard:true};
export const continuityRequirements:readonly {id:string;title:string;body:string;href:string}[];
export const institutionRecords:InstitutionRecord[];
export const institutionDirectoryRecords:InstitutionRecord[];
export const bankeizRecordedConformance:PublishedConformanceRecord;
export function institutionQualification(institution:InstitutionRecord):InstitutionQualification;
