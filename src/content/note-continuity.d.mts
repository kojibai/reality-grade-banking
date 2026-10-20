type Description = Readonly<{title:string;body:string}>;
export const noteContinuity: Readonly<{
  connectedExecutionStatus:'integration-required';
  connectedAvailability:string;
  platformRequest:string;
  platformContacts:readonly Readonly<{title:string;team:string;url:string;label:string}>[];
  paths:readonly (Description & {id:string})[];
  requirements:readonly (Description & {id:string})[];
  integrators:readonly Description[];
}>;
export const noteContinuityGuideSections: readonly (readonly [string,string])[];
