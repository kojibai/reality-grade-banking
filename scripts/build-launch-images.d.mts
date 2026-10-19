import type { ComponentType } from 'react';
export function phoneLaunchTargets(): {width: number; height: number; scale: number; orientation: string; url: string; media: string}[];
export function buildLaunchImages(directory: string, Opening: ComponentType<{resuming?: boolean}>): Promise<string>;
