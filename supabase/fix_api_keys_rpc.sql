-- ==============================================================================
-- OPUSHUNTER: FIX FUNCTION OVERLOADS & SYSTEM API KEY RPCs
-- ==============================================================================

-- 1. Ensure 'linkedin' exists in the api_provider_enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'api_provider_enum' AND e.enumlabel = 'linkedin'
    ) THEN
        ALTER TYPE public.api_provider_enum ADD VALUE 'linkedin';
    END IF;
END $$;

-- 2. Drop ALL possible overloaded variants of admin_add_api_key to remove ambiguous signatures
DROP FUNCTION IF EXISTS public.admin_add_api_key(public.api_provider_enum, text, text, text);
DROP FUNCTION IF EXISTS public.admin_add_api_key(public.api_provider_enum, text, text);
DROP FUNCTION IF EXISTS public.admin_add_api_key(public.api_provider_enum, text);
DROP FUNCTION IF EXISTS public.admin_add_api_key(text, text, text, text);
DROP FUNCTION IF EXISTS public.admin_add_api_key(text, text, text);
DROP FUNCTION IF EXISTS public.admin_add_api_key(text, text);

DROP FUNCTION IF EXISTS public.admin_list_api_keys();
DROP FUNCTION IF EXISTS public.admin_delete_api_key(uuid);
DROP FUNCTION IF EXISTS public.admin_toggle_api_key(uuid, boolean);
DROP FUNCTION IF EXISTS public.set_my_api_key(public.api_provider_enum, text, text);
DROP FUNCTION IF EXISTS public.set_my_api_key(text, text, text);
DROP FUNCTION IF EXISTS public.get_key_for_provider(text, uuid);
DROP FUNCTION IF EXISTS public.resolve_key_pool(public.api_provider_enum, uuid);

-- 3. Restore public.admin_add_api_key (Stores key reliably without NULL evaluation)
CREATE OR REPLACE FUNCTION public.admin_add_api_key(
    p_provider public.api_provider_enum,
    p_api_key text,
    p_label text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_key_id uuid;
BEGIN
    -- Check admin permission
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    IF p_api_key IS NULL OR length(trim(p_api_key)) = 0 THEN
        RAISE EXCEPTION 'API key cannot be empty.';
    END IF;

    INSERT INTO public.system_api_keys (
        provider,
        encrypted_key,
        key_label,
        is_active,
        created_at,
        updated_at
    )
    VALUES (
        p_provider,
        p_api_key,
        COALESCE(p_label, initcap(p_provider::text) || ' Fallback Key'),
        true,
        now(),
        now()
    )
    RETURNING id INTO v_key_id;

    RETURN v_key_id;
END;
$$;

-- 4. Restore public.admin_list_api_keys (Provides safe masked previews)
CREATE OR REPLACE FUNCTION public.admin_list_api_keys()
RETURNS TABLE (
    id uuid,
    provider api_provider_enum,
    key_preview text,
    key_label text,
    is_active boolean,
    total_calls bigint,
    error_count bigint,
    last_error_code text,
    rate_limited_until timestamptz,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    RETURN QUERY
    SELECT 
        k.id,
        k.provider,
        CASE 
            WHEN length(k.encrypted_key) > 8 THEN '••••' || right(k.encrypted_key, 4)
            ELSE '••••'
        END AS key_preview,
        k.key_label,
        k.is_active,
        k.total_calls,
        k.error_count,
        k.last_error_code,
        k.rate_limited_until,
        k.created_at,
        k.updated_at
    FROM public.system_api_keys k
    ORDER BY k.provider, k.created_at DESC;
END;
$$;

-- 5. Restore public.set_my_api_key (For User Vault BYOK keys)
CREATE OR REPLACE FUNCTION public.set_my_api_key(
    p_provider api_provider_enum,
    p_api_key text,
    p_label text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_key_id uuid;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF p_api_key IS NULL OR length(trim(p_api_key)) = 0 THEN
        RAISE EXCEPTION 'API key cannot be empty.';
    END IF;

    INSERT INTO public.user_api_keys (
        user_id,
        provider,
        encrypted_key,
        key_label,
        is_active,
        created_at,
        updated_at
    )
    VALUES (
        v_user_id,
        p_provider,
        p_api_key,
        COALESCE(p_label, initcap(p_provider::text) || ' Personal Key'),
        true,
        now(),
        now()
    )
    ON CONFLICT (user_id, provider) DO UPDATE SET
        encrypted_key = EXCLUDED.encrypted_key,
        key_label = COALESCE(p_label, EXCLUDED.key_label),
        is_active = true,
        updated_at = now()
    RETURNING id INTO v_key_id;

    RETURN v_key_id;
END;
$$;

-- 6. Restore public.get_key_for_provider (Internal Edge Function resolution)
CREATE OR REPLACE FUNCTION public.get_key_for_provider(
    p_provider text,
    p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
    key_id uuid,
    api_key text,
    source text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_provider_enum public.api_provider_enum;
BEGIN
    BEGIN
        v_provider_enum := p_provider::public.api_provider_enum;
    EXCEPTION WHEN OTHERS THEN
        RETURN;
    END;

    -- Step 1: Check User Key
    IF p_user_id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            id,
            encrypted_key,
            'user'::text
        FROM public.user_api_keys
        WHERE user_id = p_user_id 
          AND provider = v_provider_enum 
          AND is_active = true
          AND (rate_limited_until IS NULL OR rate_limited_until < now())
        LIMIT 1;

        IF FOUND THEN
            RETURN;
        END IF;
    END IF;

    -- Step 2: Check System Fallback Key
    RETURN QUERY
    SELECT 
        id,
        encrypted_key,
        'system'::text
    FROM public.system_api_keys
    WHERE provider = v_provider_enum 
      AND is_active = true
      AND (rate_limited_until IS NULL OR rate_limited_until < now())
    ORDER BY total_calls ASC, created_at ASC
    LIMIT 1;
END;
$$;

-- 7. Restore public.resolve_key_pool
CREATE OR REPLACE FUNCTION public.resolve_key_pool(
    p_provider api_provider_enum,
    p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
    key_id uuid,
    api_key text,
    source text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.get_key_for_provider(p_provider::text, p_user_id);
END;
$$;
