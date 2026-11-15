"use client";

import { useEffect, useState } from "react";
import { apiGet } from "./api";

type State<T> = { key: string; data?: T; error?: Error } | null;

/**
 * Pide un GET a la API y devuelve `{ data, error, loading, reload }`.
 * Cambia `path` o `params` y vuelve a pedir; cancela la petición anterior.
 */
export function useApi<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
) {
  const paramsKey = JSON.stringify(params ?? {});
  const key = `${path}?${paramsKey}`;
  const [state, setState] = useState<State<T>>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctl = new AbortController();
    apiGet<T>(path, JSON.parse(paramsKey), ctl.signal)
      .then((data) => setState({ key, data }))
      .catch((error: Error) => !ctl.signal.aborted && setState({ key, error }));
    return () => ctl.abort();
  }, [path, paramsKey, key, attempt]);

  const current = state?.key === key ? state : null;
  return {
    data: current?.data,
    error: current?.error,
    loading: !current,
    reload: () => {
      setState(null);
      setAttempt((n) => n + 1);
    },
  };
}
