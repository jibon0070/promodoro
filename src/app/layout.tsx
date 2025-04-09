import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import Providers from "./providers";
import AskForNotification from "@/components/ui/ask-for-notification";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <Toaster />
        <AskForNotification />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
