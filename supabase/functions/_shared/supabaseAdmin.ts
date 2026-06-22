/**
 * @file supabase/functions/_shared/supabaseAdmin.ts
 * @description Enterprise Service Role Instantiation
 */

// @ts-ignore: Deno npm import mapping resolved at runtime
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/../types/database/database.types.ts';

// Declare Deno namespace locally for compiler checks
declare const Deno: {
    env: {
        get: (key: string) => string | undefined;
    };
};

export const createAdminClient = () => {
    return createClient<Database>(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            },
        }
    );
};