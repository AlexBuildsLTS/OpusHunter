// app/+html.tsx
import React, { type PropsWithChildren } from "react";
import { ScrollViewStyleReset } from "expo-router/html";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en" style={{ backgroundColor: "#020617" }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                background-color: #020617 !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100vw !important;
                height: 100dvh !important; /* Fixed for mobile Firefox/Chrome */
                min-height: 100dvh !important;
                color: #f1f5f9 !important;
                overflow-x: hidden !important;
                overscroll-behavior-y: none; /* Prevents pull-to-refresh bounce */
              }
              * { box-sizing: border-box; }
            `,
          }}
        />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
