import type {
  ReceizAdmissionStore,
  ReceizAdmissionStoreInspection,
  ReceizAdmissionUnitOfWork,
} from "./admissionStore.js";
import {
  createReceizGlobalCoordinationHttpTransport,
  type ReceizGlobalCoordinationTransport,
} from "./globalCoordinationProtocol.js";

export type ReceizRemoteAdmissionStoreOptions = Readonly<{
  namespace: string;
  accessToken: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  transport?: ReceizGlobalCoordinationTransport;
}>;

function transportFor(options: ReceizRemoteAdmissionStoreOptions): ReceizGlobalCoordinationTransport {
  if (!options.namespace || !options.accessToken) throw new TypeError("REMOTE_ADMISSION_STORE_OPTIONS_REQUIRED");
  return options.transport ?? createReceizGlobalCoordinationHttpTransport({
    baseUrl: options.baseUrl ?? "https://receiz.com",
    accessToken: options.accessToken,
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
  });
}

export function createReceizRemoteAdmissionStore(options: ReceizRemoteAdmissionStoreOptions): ReceizAdmissionStore {
  const transport = transportFor(options);
  const scoped = (value: unknown) => ({ namespace: options.namespace, value });
  return Object.freeze({
    async readAggregate(aggregateId) {
      return await transport("admission.read-aggregate", scoped({ aggregateId })) as Awaited<ReturnType<ReceizAdmissionStore["readAggregate"]>>;
    },
    async readIdempotency(idempotencyKey) {
      return await transport("admission.read-idempotency", scoped({ idempotencyKey })) as Awaited<ReturnType<ReceizAdmissionStore["readIdempotency"]>>;
    },
    async commit(unit: ReceizAdmissionUnitOfWork) {
      // The existing remote protocol has no atomic read dependency / ceremony
      // replay contract. Never allow its unguarded commit to ignore those fields.
      if (unit.readDependencies !== undefined || unit.consumedPbiReceiptDigests !== undefined) {
        return { status: "rejected" as const, code: "ATOMIC_GUARDS_UNSUPPORTED" as const };
      }
      return await transport("admission.commit", scoped({ unit })) as Awaited<ReturnType<ReceizAdmissionStore["commit"]>>;
    },
    async seedAggregate(input) {
      await transport("admission.seed", scoped({ input }));
    },
    async inspect() {
      return await transport("admission.inspect", scoped({})) as ReceizAdmissionStoreInspection;
    },
  });
}
