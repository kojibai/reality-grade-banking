import { normalizeRuntimeVersionSegment } from "@/app/lib/runtime/runtimeVersion";
import { CURRENT_RELEASE_VERSION } from "@/app/lib/currentRelease.generated";

const RUNTIME_RELEASE_VERSION = normalizeRuntimeVersionSegment(process.env.NEXT_PUBLIC_SW_VERSION || CURRENT_RELEASE_VERSION) || CURRENT_RELEASE_VERSION;

export const RUNTIME_PROJECTION_STORAGE_VERSION = RUNTIME_RELEASE_VERSION;

export function runtimeProjectionStorageKey(base: string): string {
  return `${base}.${RUNTIME_PROJECTION_STORAGE_VERSION}`;
}

export function runtimeProjectionScopedStorageKey(base: string, scope: string): string {
  return `${runtimeProjectionStorageKey(base)}.${scope}`;
}
