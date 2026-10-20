"use client";

/** Transaction mechanics shared beneath enclosing proof custody. A request's
 * success is not durability: callers await the transaction's completion. */
export function completeBlobCustodyTransaction(transaction: IDBTransaction, prefix: string): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error(`${prefix}_ABORTED`));
    transaction.onerror = () => reject(transaction.error ?? new Error(`${prefix}_FAILED`));
  });
}

export function blobCustodyRequestResult<T>(request: IDBRequest<T>, prefix: string): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error(`${prefix}_READ_FAILED`));
  });
}
