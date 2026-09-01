import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { QueryProvider } from "@/components/query-provider";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

const APP_NAME = "BSE Trade Desk";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "Live BSE trade blotter with asynchronous ingestion, background workers, and SSE — never wait 15 minutes on a 30-second network.",
      },
      { name: "theme-color", content: "#09090b" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: () => (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-bg text-fg">
        <PreviewHostBridge />
        <AuthProvider>
          <QueryProvider>
            <Outlet />
            <Toaster
              theme="dark"
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "#18181c",
                  border: "1px solid #27272a",
                  color: "#f4f4f5",
                },
              }}
            />
          </QueryProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
