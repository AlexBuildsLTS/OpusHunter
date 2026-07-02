/**
 * supabase/functions/link-gmail-account/index.ts
 * OpusHunter — Link Gmail Account for Auto-Apply Sending
 * 2026-07-02 — NEW
 *
 * WHY THIS EXISTS:
 *   `automation_rules.auto_send = true` needs to send emails on the user's
 *   behalf while they're not in the app (a cron-triggered edge function,
 *   see supabase/functions/auto-apply/index.ts). That requires a Google
 *   OAuth *refresh* token with the `gmail.send` scope, captured once at
 *   sign-in time (see app/(auth)/login.tsx's `linkGmailAccount` and
 *   app/_layout.tsx's SIGNED_IN handler) and persisted server-side.
 *
 * SECURITY MODEL:
 *   - This function runs with the caller's JWT (verified below) but writes
 *     using the SERVICE ROLE client, because `connected_email_accounts`
 *     has NO client-facing RLS policies at all (see migration
 *     2026070201_location_gmail_jobfamilies.sql) — it is service-role-only
 *     by default-deny. The client can never read the refresh token back,
 *     only see (via the `connected_email_accounts_public` view) that an
 *     account IS connected and which address it is.
 *   - The refresh token itself is opaque to Google — treat this table like
 *     a secrets store. If you want an extra layer, wrap the value with
 *     Supabase Vault (`pgsodium`) before writing; the column is sized and
 *     shaped to accept an encrypted blob unchanged if you do.
 */
// deno-lint-ignore-file

import { createAdminClient } from '../_shared/supabaseAdmin.ts';
import { verifyUser } from '../_shared/auth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

declare const Deno: { serve: (handler: (req: Request) => Promise<Response>) => void };

interface LinkPayload {
    provider_token: string | null;
    provider_refresh_token: string;
}

Deno.serve(async (req: Request) => {
    const cors = getCorsHeaders();

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: cors });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
            status: 405,
            headers: { ...cors, 'Content-Type': 'application/json' },
        });
    }

    try {
        const user = await verifyUser(req);
        const body = (await req.json()) as Partial<LinkPayload>;

        if (!body.provider_refresh_token) {
            return new Response(JSON.stringify({ error: 'provider_refresh_token is required.' }), {
                status: 400,
                headers: { ...cors, 'Content-Type': 'application/json' },
            });
        }

        const admin = createAdminClient();

        // Google's OpenID userinfo endpoint confirms which address this
        // token actually belongs to — never trust the app's session email,
        // since a user could sign in with one Google account and (in
        // theory) present tokens from a stale session for another.
        let googleEmail: string | null = null;
        if (body.provider_token) {
            try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${body.provider_token}` },
                });
                if (res.ok) {
                    const info = await res.json();
                    googleEmail = info.email ?? null;
                }
            } catch {
                // Non-fatal — we still link the account, just without a
                // verified display email; UI falls back to the Supabase
                // auth email in that case.
            }
        }

        const { error } = await (admin as any)
            .from('connected_email_accounts')
            .upsert(
                {
                    user_id: user.id,
                    provider: 'google',
                    email: googleEmail ?? user.email ?? 'unknown',
                    refresh_token: body.provider_refresh_token,
                    scopes: ['gmail.send'],
                    is_primary_sender: true,
                    connected_at: new Date().toISOString(),
                },
                { onConflict: 'user_id,provider,email' },
            );

        if (error) throw error;

        return new Response(JSON.stringify({ linked: true, email: googleEmail }), {
            status: 200,
            headers: { ...cors, 'Content-Type': 'application/json' },
        });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to link Gmail account.';
        console.error('link-gmail-account error:', message);
        return new Response(JSON.stringify({ error: message }), {
            status: 401,
            headers: { ...cors, 'Content-Type': 'application/json' },
        });
    }
});