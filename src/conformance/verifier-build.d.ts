declare module 'virtual:receiz-receiver-build' {
  const build: { version: string; moduleSha256: string; sourceCommit: string };
  export default build;
}

declare module 'virtual:receiz-conformance-suite-build' {
 const build:{method:'sha256-path-content-v1';sourceTreeSha256:string;inputCount:number};
 export default build;
}
