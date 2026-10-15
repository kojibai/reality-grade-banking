declare module 'virtual:receiz-receiver-build' {
  const build: { version: string; moduleSha256: string; sourceCommit: string };
  export default build;
}
