type Description = Readonly<{title:string;body:string}>;
export const noteContinuity: Readonly<{
  connectedExecutionStatus:'integration-required';
  connectedAvailability:string;
  platformRequest:string;
  platformContacts:readonly Readonly<{title:string;team:string;url:string;label:string}>[];
  paths:readonly (Description & {id:string})[];
  requirements:readonly (Description & {id:string})[];
  states:readonly Description[];
  formats:readonly Description[];
  receivingFields:readonly Description[];
  reconciliation:readonly Description[];
  limits:readonly Description[];
  assessment:readonly Description[];
  integrators:readonly Description[];
}>;
export const noteContinuityGuideSections: readonly (readonly [string,string])[];
