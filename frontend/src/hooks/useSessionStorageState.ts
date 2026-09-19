import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

type InitialState<TValue> = TValue | (() => TValue);

function resolveInitialState<TValue>(initialState: InitialState<TValue>) {
  return typeof initialState === "function" ? (initialState as () => TValue)() : initialState;
}

export function useSessionStorageState<TValue>(
  key: string | null,
  initialState: InitialState<TValue>,
): [TValue, Dispatch<SetStateAction<TValue>>] {
  const [value, setValue] = useState<TValue>(() => {
    if (!key || typeof window === "undefined") {
      return resolveInitialState(initialState);
    }

    try {
      const storedValue = window.sessionStorage.getItem(key);
      return storedValue ? (JSON.parse(storedValue) as TValue) : resolveInitialState(initialState);
    } catch {
      window.sessionStorage.removeItem(key);
      return resolveInitialState(initialState);
    }
  });

  useEffect(() => {
    if (!key || typeof window === "undefined") return;

    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be unavailable in private mode or full quota states.
    }
  }, [key, value]);

  return [value, setValue];
}
