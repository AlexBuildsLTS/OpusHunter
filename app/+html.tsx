import React, { type PropsWithChildren } from "react";
import { ScrollViewStyleReset } from "expo-router/html";

/**
 * This file is web-only and used to configure the root HTML for every web page.
 * The <html style="background-color: #020617"> and <body style="background-color: #020617">
 * guarantee that under NO circumstance can a white background ever be rendered.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en" style={{ backgroundColor: "#020617" }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                background-color: #020617 !important;
                background: #020617 !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: 100% !important;
                min-height: 100vh !important;
                color: #f1f5f9 !important;
                overflow-x: hidden !important;
              }
              div[style*="rgb(242, 242, 242)"],
              div[style*="242, 242, 242"] {
                background-color: transparent !important;
              }
              * {
                box-sizing: border-box;
              }
            `,
          }}
        />
        <ScrollViewStyleReset />
      </head>
      <body style={{ backgroundColor: "#020617", margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
