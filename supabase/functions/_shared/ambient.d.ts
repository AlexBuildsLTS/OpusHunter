/**
 * supabase/functions/_shared/ambient.d.ts
 * Ambient type declarations to ensure zero red squigglies in VS Code
 * for Deno globals and npm specifiers across all Supabase Edge Functions.
 */

declare namespace Deno {
  export const env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    toObject(): Record<string, string>;
  };
  export function serve(
    handler: (req: Request) => Response | Promise<Response> | void,
  ): void;
  export namespace serve {
    function port(): number;
  }
}

declare module "npm:pdf-parse@1.1.1" {
  function pdfParse(
    buffer: Uint8Array | ArrayBuffer | Record<string, unknown>,
  ): Promise<{ text: string }>;
  export default pdfParse;
}

declare module "npm:mammoth@1.8.0" {
  export function extractRawText(input: {
    buffer: Uint8Array | ArrayBuffer | Record<string, unknown>;
  }): Promise<{ value: string }>;
}
