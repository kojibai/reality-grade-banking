const UUID = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
// Keep ten seconds of cleanup margin inside the existing120s deployment.
export const NATIVE_CHAT_STREAM_TIMEOUT_MS = 110_000;
const conversation = new RegExp(`^/api/chat/conversations/${UUID}/(messages(?:/stream)?|typing(?:/stream)?|ai|calls(?:/${UUID}(?:/(?:participants|signals|sfu/session))?)?)$`, 'i');
const stream = new RegExp(`^/api/chat/conversations/${UUID}/(?:messages|typing)/stream$`, 'i');
const instant = (v: string) => v.length <= 40 && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(v) && Number.isFinite(Date.parse(v));
function page(url: URL, coordinate: 'before' | 'since', min: number, max: number) {
  if ([...url.searchParams.keys()].some(key => !['limit', coordinate].includes(key) || url.searchParams.getAll(key).length !== 1)) return false;
  const limit = url.searchParams.get('limit'), at = url.searchParams.get(coordinate);
  return (limit === null || /^\d{1,3}$/.test(limit) && Number(limit) >= min && Number(limit) <= max) && (at === null || instant(at));
}
/** Transport only. The existing Receiz host must independently validate its
 * registered bearer scope, principal and conversation/call membership. */
export function permittedNativeChatPath(url: URL, method: string): boolean {
  const verb = method.toUpperCase(), path = url.pathname;
  if (path === '/api/chat/conversations') return ['GET','POST'].includes(verb) && !url.search;
  if (['/api/chat/ai','/api/chat/calls/ice'].includes(path)) return verb === 'GET' && !url.search;
  const match = conversation.exec(path); if (!match) return false;
  const tail = match[1].toLowerCase();
  if (tail === 'messages') return verb === 'GET' ? page(url,'before',10,300) : verb === 'POST' && !url.search;
  if (tail === 'messages/stream') return verb === 'POST' && !url.search;
  if (tail === 'typing') return verb === 'POST' && !url.search;
  if (tail === 'typing/stream') return verb === 'GET' && !url.search;
  if (tail === 'ai') return ['GET','PATCH'].includes(verb) && !url.search;
  if (tail.endsWith('/signals')) return verb === 'GET' ? page(url,'since',1,600) : verb === 'POST' && !url.search;
  if (tail.endsWith('/participants')) return ['POST','DELETE'].includes(verb) && !url.search;
  if (tail.endsWith('/sfu/session')) return verb === 'GET' && !url.search;
  return (tail === 'calls' ? ['GET','POST'] : ['GET','PATCH']).includes(verb) && !url.search;
}
export const isNativeChatStreamPath = (path: string) => stream.test(path);
