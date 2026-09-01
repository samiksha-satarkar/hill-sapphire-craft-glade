import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchInterval: false,
        retry: 1,
        staleTime: 15_000,
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(makeClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
