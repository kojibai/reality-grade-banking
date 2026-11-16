import regular from '../../scripts/social/fonts/Inter-Regular.ttf?url&inline';
import semibold from '../../scripts/social/fonts/Inter-SemiBold.ttf?url&inline';

/** Loaded only by the requested PDF authoring branch, never by draft readers. */
export const businessDocumentFontUrls = [regular, semibold] as const;
