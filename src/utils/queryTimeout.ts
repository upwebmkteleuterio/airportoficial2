export const LIST_QUERY_TIMEOUT_MS = 12_000;

export function withQueryTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  querySignal: AbortSignal,
  timeoutMs = LIST_QUERY_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let settled = false;
  let handleQueryAbort = () => undefined;

  const cleanup = () => {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    querySignal.removeEventListener('abort', handleQueryAbort);
  };

  const finish = (callback: () => void) => {
    if (settled) return;
    settled = true;
    cleanup();
    callback();
  };

  if (querySignal.aborted) {
    controller.abort(querySignal.reason);
    return Promise.reject(querySignal.reason instanceof Error ? querySignal.reason : new Error('A solicitação foi cancelada.'));
  }

  return new Promise<T>((resolve, reject) => {
    handleQueryAbort = () => {
      controller.abort(querySignal.reason);
      finish(() => reject(querySignal.reason instanceof Error ? querySignal.reason : new Error('A solicitação foi cancelada.')));
    };

    querySignal.addEventListener('abort', handleQueryAbort, { once: true });
    timeoutId = setTimeout(() => {
      controller.abort();
      finish(() => reject(new Error('A solicitação excedeu o tempo limite.')));
    }, timeoutMs);

    try {
      operation(controller.signal).then(
        (value) => finish(() => resolve(value)),
        (error: unknown) => finish(() => reject(error)),
      );
    } catch (error) {
      finish(() => reject(error));
    }
  });
}

export default withQueryTimeout;
