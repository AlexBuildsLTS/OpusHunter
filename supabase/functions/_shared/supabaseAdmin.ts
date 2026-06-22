/**
 * supabase/functions/_shared/supabaseAdmin.ts
 * OpusHunter — Service Role Client
 *
 * FIX P1-05: Previous import path was:
 *   import type { Database } from '@/../types/database/database.types.ts'
 * This is wrong — the `@/` alias does not resolve in the Deno runtime.
 * The Deno edge function runtime uses URLs or relative paths only.
 *
 * The functions directory sits at: supabase/functions/
 * The types file sits at:          types/database.types.ts
 * From _shared/, the relative path to repo root is: ../../../
 * So the correct path is:          ../../../types/database.types.ts
 *
 * NOTE: If the types file is not deployed alongside functions,
 * use a Deno import map entry in deno.json instead.
 */

// deno-lint-ignore-file
import { createClient } from 'npm:@supabase/supabase-js@2';
import type { Database } from '../../../types/database.types.ts';

declare const Deno: {
    env: { get: (key: string) => string | undefined };
};

export const createAdminClient = () => {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!url || !serviceKey) {
        throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars are not set.');
    }

    return createClient<Database>(url, serviceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    });
};