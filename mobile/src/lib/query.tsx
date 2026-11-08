import type { ReactNode } from "react";
import { AppState } from "react-native";
import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";

/** Data is cached per screen and refreshed when the app comes back to the foreground. */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

AppState.addEventListener("change", (state) => focusManager.setFocused(state === "active"));

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
