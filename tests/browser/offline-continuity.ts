import { saveDeviceIdentity, loadDeviceIdentity, retainProofBatch, loadDepositSources, loadProofArchive, saveBankOperation, loadBankOperation, saveOfflineNoteState, loadOfflineNoteState } from '../../src/receiz/identity-vault';
import { proofDigest } from '../../src/receiz/proof-library';
import { readOfflineReadiness } from '../../src/pwa/offline-status';
import { bankNoteArtwork } from '../../src/receiz/note-artwork';
import { BANK_APPLICATION_ID } from '../../src/receiz/config';
const bytes = (value: string) => new TextEncoder().encode(value);
const identityBytes = bytes('offline-continuity-isolated-storage-fixture-not-an-account');
const binding = { artifactSha256: await proofDigest(identityBytes) };
const original = { kind: 'owned-source' as const, filename: 'test-only-original.receiz', bytes: bytes('exact fixture original; no financial proof admission') };
const recovery = { kind: 'execution-recovery' as const, filename: 'test-only-recovery.json', bytes: bytes('exact fixture receipt; no financial proof admission') };
const plan = { applicationId: BANK_APPLICATION_ID, attemptId: 'offline-update-fixture', exactPlanDigest: 'd'.repeat(64), unknownNamespace: { exact: 'preserve these fields', values: [1, 2, 3] } };
const pending = { schema: 'bank.execution-checkpoint.v1', operationId: plan.attemptId, plan, transitionSet: { unknownNamespace: ['do not replace'] }, state: 'unknown' } as unknown as Parameters<typeof saveBankOperation>[1];
const noteState = { schema: 'receiz.bank.offline-notes-device.v1', keyId: 'test-only', unknownNamespace: { value: 'exact retained note choreography' }, receivers: {}, notes: {}, deposits: {} };
const config = await (await fetch('/__offline_continuity__/config')).json();
const output = document.querySelector('pre')!;
function button(name: string, work: () => Promise<unknown>) {
  const element = document.createElement('button'); element.textContent = name;
  element.onclick = async () => { element.disabled = true; output.textContent = 'Running…'; try { output.textContent = JSON.stringify(await work(), null, 2); } catch (error) { output.textContent = JSON.stringify({ passed: false, error: String(error) }); } finally { element.disabled = false; } };
  document.querySelector('nav')!.append(element);
}
button('Install and inspect offline build', async () => {
  await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
  await navigator.serviceWorker.ready;
  return { status: await readOfflineReadiness(navigator.serviceWorker), controlled: !!navigator.serviceWorker.controller };
});
button('Reload test page', async () => { location.reload(); return null; });
button('Verify cached resources', async () => {
  if (!navigator.serviceWorker.controller) throw Error('Reload the test page once after installation.');
  const port = new MessageChannel();
  const status = await new Promise<{ build: string }>(resolve => { port.port1.onmessage = event => { resolve(event.data); port.port1.close(); }; navigator.serviceWorker.controller!.postMessage({ type: 'BANK_OFFLINE_STATUS', version: 1 }, [port.port2]); });
  const manifest = config.find((value: { version: string }) => value.version === status.build);
  if (!manifest) throw Error('Unexpected fixture build');
  for (const entry of manifest.resources) {
    const response = await fetch(entry.url); if (!response.ok || await proofDigest(new Uint8Array(await response.arrayBuffer())) !== entry.sha256) throw Error('Exact offline resource mismatch: ' + entry.url);
  }
  return { passed: true, build: manifest.version, resources: manifest.resources.length, status: await readOfflineReadiness(navigator.serviceWorker) };
});
button('Seed encrypted continuity fixture', async () => {
  const held = await loadDeviceIdentity();
  if (held && await proofDigest(held.bytes) !== binding.artifactSha256) throw Error('Use a fresh isolated test origin. Never replace a real ID.');
  await saveDeviceIdentity(identityBytes, 'test-only.bin', 'test-only-not-a-user-phrase', true);
  await retainProofBatch(binding, [original, recovery]);
  if (!await loadBankOperation(binding)) await saveBankOperation(binding, pending, 'new');
  if (!await loadOfflineNoteState(binding)) await saveOfflineNoteState(binding, noteState, null);
  return { passed: true, fixture: 'Encrypted storage only; no account enrollment, proof admission or funds.' };
});
button('Verify encrypted continuity', async () => {
  const identity = await loadDeviceIdentity(), owned = await loadDepositSources(binding, { requireComplete: true, originalsOnly: true }), archived = await loadProofArchive(binding);
  const checks = {
    identity: !!identity && await proofDigest(identity.bytes) === binding.artifactSha256,
    exactOriginal: owned.length === 1 && await proofDigest(owned[0].bytes) === await proofDigest(original.bytes),
    exactReceipt: archived.length === 1 && await proofDigest(archived[0].bytes) === await proofDigest(recovery.bytes),
    exactPendingAndUnknownNamespaces: JSON.stringify(await loadBankOperation(binding)) === JSON.stringify(pending),
    exactNoteStateAndUnknownNamespaces: JSON.stringify(await loadOfflineNoteState(binding)) === JSON.stringify(noteState),
  };
  return { passed: Object.values(checks).every(Boolean), checks };
});
button('Request deployment update', async () => {
  const registration = await navigator.serviceWorker.getRegistration(); await registration!.update();
  return { waiting: !!registration?.waiting, installing: !!registration?.installing, status: await readOfflineReadiness(navigator.serviceWorker) };
});
button('Inspect update state', async () => { const registration = await navigator.serviceWorker.getRegistration(); return { waiting: !!registration?.waiting, installing: !!registration?.installing, status: await readOfflineReadiness(navigator.serviceWorker) }; });
button('Render offline note specimen', async () => {
  const image = new Image(); image.alt = 'Unissued offline Reserve Note artwork fixture';
  const png = await bankNoteArtwork('10000', 'unissued-test-only', true, 'reserve'); image.src = URL.createObjectURL(new Blob([new Uint8Array(png)], { type: 'image/png' }));
  image.style.cssText = 'max-width:360px;width:100%;display:block;margin:20px 0'; await image.decode(); document.querySelector('figure')!.replaceChildren(image);
  return { passed: image.naturalWidth === 360 && image.naturalHeight === 216, width: image.naturalWidth, height: image.naturalHeight, specimenOnly: true };
});
