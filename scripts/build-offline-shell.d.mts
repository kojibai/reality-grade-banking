export interface OfflineBuild { schema: 'bankeiz.offline-build.v1'; version: string; publicRenderBuild: string; resources: { url: string; sha256: string; bytes: number }[]; pages: Record<string, string>; }
export function buildOfflineShell(directory?: string, options?: { fixed?: string[]; renderBuildFile?: string | URL }): Promise<OfflineBuild>;
