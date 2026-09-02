


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."ai_provider" AS ENUM (
    'gemini',
    'rapidapi'
);


ALTER TYPE "public"."ai_provider" OWNER TO "postgres";


CREATE TYPE "public"."api_provider_enum" AS ENUM (
    'gemini',
    'rapidapi',
    'geodb',
    'adzuna',
    'openai',
    'anthropic',
    'linkedin'
);


ALTER TYPE "public"."api_provider_enum" OWNER TO "postgres";


CREATE TYPE "public"."application_status_enum" AS ENUM (
    'discovered',
    'saved',
    'applied',
    'interview',
    'offer',
    'rejected',
    'withdrawn'
);


ALTER TYPE "public"."application_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."cover_letter_strategy_enum" AS ENUM (
    'mirror_matching',
    'achievement_amplification',
    'insider_narrative'
);


ALTER TYPE "public"."cover_letter_strategy_enum" OWNER TO "postgres";


CREATE TYPE "public"."job_source_enum" AS ENUM (
    'jsearch',
    'adzuna',
    'linkedin',
    'indeed',
    'custom'
);


ALTER TYPE "public"."job_source_enum" OWNER TO "postgres";


CREATE TYPE "public"."job_status" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'applied'
);


ALTER TYPE "public"."job_status" OWNER TO "postgres";


CREATE TYPE "public"."key_source_enum" AS ENUM (
    'user',
    'system'
);


ALTER TYPE "public"."key_source_enum" OWNER TO "postgres";


CREATE TYPE "public"."seniority_level_enum" AS ENUM (
    'junior',
    'mid',
    'senior',
    'lead',
    'principal',
    'director',
    'vp',
    'c_level'
);


ALTER TYPE "public"."seniority_level_enum" OWNER TO "postgres";


CREATE TYPE "public"."support_ticket_priority" AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


ALTER TYPE "public"."support_ticket_priority" OWNER TO "postgres";


CREATE TYPE "public"."support_ticket_status" AS ENUM (
    'open',
    'in_progress',
    'resolved',
    'closed'
);


ALTER TYPE "public"."support_ticket_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'member',
    'premium',
    'admin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE TYPE "public"."work_type_enum" AS ENUM (
    'remote',
    'hybrid',
    'onsite',
    'flexible'
);


ALTER TYPE "public"."work_type_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_add_api_key"("p_provider" "public"."api_provider_enum", "p_api_key" "text", "p_label" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    v_key_id uuid;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    IF p_api_key IS NULL OR length(trim(p_api_key)) = 0 THEN
        RAISE EXCEPTION 'API key cannot be empty.';
    END IF;

    INSERT INTO public.system_api_keys (
        provider,
        encrypted_key,
        label,
        tier,
        is_active,
        created_at
    )
    VALUES (
        p_provider,
        p_api_key,
        COALESCE(p_label, initcap(p_provider::text) || ' Fallback Key'),
        'fallback',
        true,
        now()
    )
    RETURNING id INTO v_key_id;

    RETURN v_key_id;
END;
$$;


ALTER FUNCTION "public"."admin_add_api_key"("p_provider" "public"."api_provider_enum", "p_api_key" "text", "p_label" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_delete_user"("target_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  delete from auth.users where id = target_id; -- cascades to profiles and all owned rows
end;
$$;


ALTER FUNCTION "public"."admin_delete_user"("target_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_list_api_keys"() RETURNS TABLE("id" "uuid", "provider" "public"."api_provider_enum", "key_preview" "text", "label" "text", "is_active" boolean, "last_used_at" timestamp with time zone, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
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
        k.label,
        k.is_active,
        k.last_used_at,
        k.created_at
    FROM public.system_api_keys k
    ORDER BY k.provider, k.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."admin_list_api_keys"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_list_users"("p_page" integer DEFAULT 1, "p_page_size" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "email" "text", "first_name" "text", "last_name" "text", "avatar_url" "text", "role" "public"."user_role", "profile_complete" boolean, "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
  SELECT
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.avatar_url,
    p.role,
    p.profile_complete,
    p.created_at
  FROM public.profiles p
  WHERE public.is_admin()
  ORDER BY p.created_at DESC
  LIMIT p_page_size OFFSET ((greatest(p_page, 1) - 1) * p_page_size);
$$;


ALTER FUNCTION "public"."admin_list_users"("p_page" integer, "p_page_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_set_api_key_active"("p_key_id" "uuid", "p_active" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  update public.system_api_keys set is_active = p_active where id = p_key_id;
end;
$$;


ALTER FUNCTION "public"."admin_set_api_key_active"("p_key_id" "uuid", "p_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_and_increment_daily_applications"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
declare
  v_cap   int;
  v_count int;
begin
  select max_daily_applications into v_cap from public.profiles where id = p_user_id;

  insert into public.usage_counters (user_id, counter_date, applications_count)
  values (p_user_id, current_date, 0)
  on conflict (user_id, counter_date) do nothing;

  select applications_count into v_count from public.usage_counters
  where user_id = p_user_id and counter_date = current_date;

  if v_count >= v_cap then
    return false;
  end if;

  update public.usage_counters set applications_count = applications_count + 1
  where user_id = p_user_id and counter_date = current_date;

  return true;
end;
$$;


ALTER FUNCTION "public"."check_and_increment_daily_applications"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clear_my_api_key"("p_provider" "public"."api_provider_enum") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
begin
  delete from public.user_api_keys where user_id = auth.uid() and provider = p_provider;
end;
$$;


ALTER FUNCTION "public"."clear_my_api_key"("p_provider" "public"."api_provider_enum") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."force_set_role"("target_email" "text", "target_role" "public"."user_role") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  update public.profiles set role = target_role
  where id = (select id from auth.users where email = target_email);
end;
$$;


ALTER FUNCTION "public"."force_set_role"("target_email" "text", "target_role" "public"."user_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_dashboard_stats"() RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
  SELECT CASE WHEN public.is_admin() THEN
    jsonb_build_object(
      'total_users', (SELECT count(*) FROM public.profiles),
      'new_users_7d', (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '7 days'),
      'total_applications', (SELECT count(*) FROM public.job_applications),
      'total_cover_letters', (SELECT count(*) FROM public.cover_letters),
      'total_jobs_discovered', (SELECT count(*) FROM public.job_vault),
      'active_api_keys', (SELECT count(*) FROM public.system_api_keys WHERE is_active = true),
      'api_cost_this_month', (SELECT coalesce(sum(cost_estimate_usd), 0) FROM public.api_key_usage_logs
                               WHERE created_at >= date_trunc('month', now())),
      'failed_api_calls_24h', (SELECT count(*) FROM public.api_key_usage_logs
                               WHERE created_at >= now() - interval '24 hours' AND success = false),
      'total_tokens_used_24h', (SELECT coalesce(sum(tokens_used), 0) FROM public.api_key_usage_logs
                                WHERE created_at >= now() - interval '24 hours')
    )
  ELSE '{}'::jsonb END;
$$;


ALTER FUNCTION "public"."get_admin_dashboard_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_key_for_provider"("p_provider" "text", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("key_id" "uuid", "api_key" "text", "source" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    v_provider_enum public.api_provider_enum;
BEGIN
    BEGIN
        v_provider_enum := p_provider::public.api_provider_enum;
    EXCEPTION WHEN OTHERS THEN
        RETURN;
    END;

    -- Check User Key
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

    -- Check System Fallback Key
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


ALTER FUNCTION "public"."get_key_for_provider"("p_provider" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_key_for_provider"("p_user_id" "uuid", "p_provider" "public"."api_provider_enum") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
declare v_key text;
begin
  select pgp_sym_decrypt(encrypted_key::bytea, current_setting('app.key_secret', true))
  into v_key
  from public.user_api_keys
  where user_id = p_user_id and provider = p_provider and is_active = true;

  if v_key is not null then return v_key; end if;

  select pgp_sym_decrypt(encrypted_key::bytea, current_setting('app.key_secret', true))
  into v_key
  from public.system_api_keys
  where provider = p_provider and is_active = true
    and (throttled_until is null or throttled_until < now())
  order by priority_order asc
  limit 1;

  return v_key;
end;
$$;


ALTER FUNCTION "public"."get_key_for_provider"("p_user_id" "uuid", "p_provider" "public"."api_provider_enum") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_connected_email_accounts"() RETURNS TABLE("id" "uuid", "email" "text", "provider" "text", "is_primary_sender" boolean, "connected_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
  select id, email, provider, is_primary_sender, connected_at
  from public.connected_email_accounts
  where user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_connected_email_accounts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_pipeline_metrics"() RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
  SELECT jsonb_build_object(
    'discovered', (SELECT count(*) FROM public.job_vault WHERE user_id = auth.uid()),
    'total_discovered_all_time', (SELECT count(*) FROM public.job_vault WHERE user_id = auth.uid()),
    'global_discovered_all_time', (SELECT count(*) FROM public.job_vault),
    'saved',      count(*) FILTER (WHERE status = 'saved'),
    'applied',    count(*) FILTER (WHERE status = 'applied'),
    'interview',  count(*) FILTER (WHERE status = 'interview'),
    'offer',      count(*) FILTER (WHERE status = 'offer'),
    'rejected',   count(*) FILTER (WHERE status = 'rejected')
  )
  FROM public.job_applications
  WHERE user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_user_pipeline_metrics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
declare
  v_full_name text;
  v_first     text;
  v_last      text;
begin
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '');
  v_first := split_part(v_full_name, ' ', 1);
  v_last  := nullif(trim(substring(v_full_name from length(v_first) + 1)), '');

  insert into public.profiles (id, email, first_name, last_name, avatar_url)
  values (
    new.id,
    new.email,
    nullif(v_first, ''),
    v_last,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_self_privilege_escalation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- service_role (edge functions using the admin client) always allowed through.
  if auth.role() = 'service_role' then
    return new;
  end if;

  -- An existing admin acting through the client is allowed to change role/quota
  -- (covers admin.tsx doing a direct update rather than the RPC path, as a
  -- defense-in-depth fallback — force_set_role() remains the intended path).
  if public.is_admin() then
    return new;
  end if;

  -- Anyone else: role and max_daily_applications are frozen to their old values,
  -- regardless of what the UPDATE statement tried to set them to.
  if new.role is distinct from old.role then
    new.role := old.role;
  end if;

  if new.max_daily_applications is distinct from old.max_daily_applications then
    new.max_daily_applications := old.max_daily_applications;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."prevent_self_privilege_escalation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_role_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Allow any update (including role changes) as requested
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_role_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_key_pool"("p_user_id" "uuid", "p_provider" "public"."api_provider_enum") RETURNS TABLE("key" "text", "source" "public"."key_source_enum", "key_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
begin
  return query
    select extensions.pgp_sym_decrypt(u.encrypted_key::bytea, current_setting('app.key_secret', true)),
           'user'::public.key_source_enum,
           u.id
    from public.user_api_keys u
    where u.user_id = p_user_id and u.provider = p_provider and u.is_active = true;

  return query
    select extensions.pgp_sym_decrypt(s.encrypted_key::bytea, current_setting('app.key_secret', true)),
           'system'::public.key_source_enum,
           s.id
    from public.system_api_keys s
    where s.provider = p_provider and s.is_active = true
      and (s.throttled_until is null or s.throttled_until < now())
    order by s.priority_order asc;
end;
$$;


ALTER FUNCTION "public"."resolve_key_pool"("p_user_id" "uuid", "p_provider" "public"."api_provider_enum") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_key_pool"("p_provider" "public"."api_provider_enum", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("key_id" "uuid", "api_key" "text", "source" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.get_key_for_provider(p_provider::text, p_user_id);
END;
$$;


ALTER FUNCTION "public"."resolve_key_pool"("p_provider" "public"."api_provider_enum", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_current_timestamp_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_current_timestamp_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_my_api_key"("p_provider" "public"."api_provider_enum", "p_key" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
begin
  insert into public.user_api_keys (user_id, provider, encrypted_key)
  values (auth.uid(), p_provider, pgp_sym_encrypt(p_key, current_setting('app.key_secret', true))::text)
  on conflict (user_id, provider)
  do update set encrypted_key = excluded.encrypted_key, is_active = true;
end;
$$;


ALTER FUNCTION "public"."set_my_api_key"("p_provider" "public"."api_provider_enum", "p_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_my_api_key"("p_provider" "public"."api_provider_enum", "p_api_key" "text", "p_label" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
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


ALTER FUNCTION "public"."set_my_api_key"("p_provider" "public"."api_provider_enum", "p_api_key" "text", "p_label" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_primary_resume"("p_document_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
begin
  update public.resume_documents set is_primary = false where user_id = auth.uid();
  update public.resume_documents set is_primary = true
  where id = p_document_id and user_id = auth.uid();
end;
$$;


ALTER FUNCTION "public"."set_primary_resume"("p_document_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_unlimited_applications_for_admin"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    NEW.max_daily_applications := 999999;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_unlimited_applications_for_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_modified_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_modified_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_ticket_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.support_tickets SET updated_at = now() WHERE id = NEW.ticket_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_ticket_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."api_key_usage_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "provider" "public"."api_provider_enum" NOT NULL,
    "key_source" "public"."key_source_enum" NOT NULL,
    "function_name" "text" NOT NULL,
    "strategy_used" "public"."cover_letter_strategy_enum",
    "tokens_used" integer DEFAULT 0 NOT NULL,
    "cost_estimate_usd" numeric(10,6) DEFAULT 0 NOT NULL,
    "status_code" integer DEFAULT 200 NOT NULL,
    "success" boolean DEFAULT true NOT NULL,
    "error_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."api_key_usage_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."api_key_usage_logs" IS 'Every key resolution attempt, success or fail. Powers the admin usage dashboard and cost tracking.';



CREATE TABLE IF NOT EXISTS "public"."automation_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "keywords" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "work_types" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "experience_levels" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "location" "text" DEFAULT 'Stockholm, Sweden'::"text" NOT NULL,
    "latitude" numeric(9,6),
    "longitude" numeric(9,6),
    "max_distance_km" integer DEFAULT 50,
    "remote_preference" "text" DEFAULT 'flexible'::"text" NOT NULL,
    "salary_min" integer,
    "base_cover_letter" "text" DEFAULT ''::"text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."automation_rules" OWNER TO "postgres";


COMMENT ON TABLE "public"."automation_rules" IS 'Saved search + auto-apply criteria a user can run repeatedly or automate.';



CREATE TABLE IF NOT EXISTS "public"."certifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "file_type" "text" DEFAULT 'application/pdf'::"text" NOT NULL,
    "file_size_kb" integer,
    "cert_name" "text",
    "cert_issuer" "text",
    "cert_date" "date",
    "cert_tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."certifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."certifications" IS 'Uploaded certification files, unlimited per user, tagged for skill-matching.';



CREATE TABLE IF NOT EXISTS "public"."connected_email_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "provider" "text" DEFAULT 'gmail'::"text" NOT NULL,
    "email" "text" NOT NULL,
    "refresh_token" "text" NOT NULL,
    "scopes" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_primary_sender" boolean DEFAULT false NOT NULL,
    "connected_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."connected_email_accounts" OWNER TO "postgres";


COMMENT ON TABLE "public"."connected_email_accounts" IS 'Gmail send-as accounts for dispatching application emails. Separate from Supabase Auth login.';



CREATE TABLE IF NOT EXISTS "public"."cover_letters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "job_id" "uuid",
    "company" "text",
    "job_title" "text",
    "title" "text" DEFAULT 'Cover Letter'::"text" NOT NULL,
    "body" "text" NOT NULL,
    "strategy_used" "public"."cover_letter_strategy_enum",
    "alternative_versions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "tone" "text" DEFAULT 'professional'::"text" NOT NULL,
    "ats_score" numeric(5,2),
    "specificity_score" numeric(5,2),
    "filler_phrase_count" integer DEFAULT 0 NOT NULL,
    "generated_by" "text" DEFAULT 'gemini-3-flash'::"text" NOT NULL,
    "tokens_used" integer,
    "generation_duration_ms" integer,
    "is_default" boolean DEFAULT false NOT NULL,
    "user_edited" boolean DEFAULT false NOT NULL,
    "automation_rule_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cover_letters" OWNER TO "postgres";


COMMENT ON TABLE "public"."cover_letters" IS 'Generated cover letters. alternative_versions stores the two non-winning strategies for the compare UI.';



CREATE TABLE IF NOT EXISTS "public"."interview_preps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "job_id" "uuid" NOT NULL,
    "brief_markdown" "text" NOT NULL,
    "generated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."interview_preps" OWNER TO "postgres";


COMMENT ON TABLE "public"."interview_preps" IS 'AI-generated interview briefs per job, viewable once an application reaches interview status.';



CREATE TABLE IF NOT EXISTS "public"."job_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "job_id" "uuid" NOT NULL,
    "status" "public"."application_status_enum" DEFAULT 'discovered'::"public"."application_status_enum" NOT NULL,
    "cover_letter_used" "uuid",
    "resume_document_id" "uuid",
    "submission_method" "text",
    "ats_provider" "text",
    "sender_email" "text",
    "sender_full_name" "text",
    "submission_confirmation" "text",
    "submission_error" "text",
    "applied_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."job_applications" OWNER TO "postgres";


COMMENT ON TABLE "public"."job_applications" IS 'Tracks each job through the pipeline. One row per (user, job) — status drives the kanban columns.';



CREATE TABLE IF NOT EXISTS "public"."job_vault" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "source" "public"."job_source_enum" NOT NULL,
    "external_job_id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "company" "text" NOT NULL,
    "company_logo_url" "text",
    "location" "text",
    "country_code" "text",
    "latitude" numeric(9,6),
    "longitude" numeric(9,6),
    "is_remote" boolean DEFAULT false NOT NULL,
    "work_type" "public"."work_type_enum",
    "salary" "text",
    "salary_min" integer,
    "salary_max" integer,
    "currency" "text",
    "description" "text",
    "tech_stack" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "match_score" numeric(5,2),
    "url" "text" NOT NULL,
    "source_url" "text" NOT NULL,
    "dedup_hash" "text" NOT NULL,
    "posted_at" timestamp with time zone,
    "scraped_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."job_vault" OWNER TO "postgres";


COMMENT ON TABLE "public"."job_vault" IS 'Deduplicated job listings per user. dedup_hash prevents the same posting reappearing from multiple sources or re-scrapes.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "avatar_url" "text",
    "professional_title" "text",
    "bio" "text",
    "years_experience" integer,
    "seniority_level" "public"."seniority_level_enum",
    "target_roles" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "work_type_preferences" "public"."work_type_enum"[] DEFAULT '{}'::"public"."work_type_enum"[] NOT NULL,
    "languages" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "target_countries" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "target_cities" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "location_radius_km" integer DEFAULT 50 NOT NULL,
    "latitude" numeric(9,6),
    "longitude" numeric(9,6),
    "country_code" "text",
    "salary_min" integer,
    "salary_max" integer,
    "salary_currency" "text" DEFAULT 'SEK'::"text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'member'::"public"."user_role" NOT NULL,
    "profile_complete" boolean DEFAULT false NOT NULL,
    "max_daily_applications" integer DEFAULT 10 NOT NULL,
    "gmail_linked_email" "text",
    "last_scrape_time" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_years_experience_check" CHECK ((("years_experience" IS NULL) OR (("years_experience" >= 0) AND ("years_experience" <= 60))))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'One row per user. Source of truth for identity, search prefs, role, and quotas.';



CREATE TABLE IF NOT EXISTS "public"."resume_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "file_type" "text" DEFAULT 'application/pdf'::"text" NOT NULL,
    "file_size_kb" integer,
    "label" "text",
    "is_primary" boolean DEFAULT false NOT NULL,
    "extraction_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "resume_documents_extraction_status_check" CHECK (("extraction_status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'complete'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."resume_documents" OWNER TO "postgres";


COMMENT ON TABLE "public"."resume_documents" IS 'Uploaded CV files. Exactly one per user should have is_primary = true (enforced in app layer via set_primary_resume()).';



CREATE TABLE IF NOT EXISTS "public"."scrape_rate_limits" (
    "user_id" "uuid" NOT NULL,
    "last_scrape_at" timestamp with time zone,
    "scrape_count_today" integer DEFAULT 0 NOT NULL,
    "reset_at" timestamp with time zone DEFAULT ("date_trunc"('day'::"text", "now"()) + '1 day'::interval) NOT NULL
);


ALTER TABLE "public"."scrape_rate_limits" OWNER TO "postgres";


COMMENT ON TABLE "public"."scrape_rate_limits" IS 'Guards free-tier scrape frequency. Premium users with their own RapidAPI key bypass this in app logic.';



CREATE TABLE IF NOT EXISTS "public"."support_ticket_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "is_staff" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."support_ticket_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "subject" "text" NOT NULL,
    "description" "text" NOT NULL,
    "priority" "public"."support_ticket_priority" DEFAULT 'medium'::"public"."support_ticket_priority" NOT NULL,
    "status" "public"."support_ticket_status" DEFAULT 'open'::"public"."support_ticket_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."support_tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_api_keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "public"."api_provider_enum" NOT NULL,
    "encrypted_key" "text" NOT NULL,
    "tier" "text" DEFAULT 'standard'::"text" NOT NULL,
    "priority_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "label" "text" NOT NULL,
    "last_used_at" timestamp with time zone,
    "throttled_until" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."system_api_keys" OWNER TO "postgres";


COMMENT ON TABLE "public"."system_api_keys" IS 'Admin-managed fallback key pool. Never client-readable. Cascade falls here when a user has no active key of their own.';



CREATE TABLE IF NOT EXISTS "public"."usage_counters" (
    "user_id" "uuid" NOT NULL,
    "counter_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "applications_count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."usage_counters" OWNER TO "postgres";


COMMENT ON TABLE "public"."usage_counters" IS 'Daily send counter, checked against profiles.max_daily_applications before auto-apply fires.';



CREATE TABLE IF NOT EXISTS "public"."user_api_keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "provider" "public"."api_provider_enum" NOT NULL,
    "encrypted_key" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_api_keys" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_api_keys" IS 'BYOK keys. Never client-readable — Service-Role only. Tried first in the key cascade.';



CREATE TABLE IF NOT EXISTS "public"."user_context" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "extracted_skills" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "extracted_experience" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "extracted_education" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "extracted_certifications" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "career_summary" "text",
    "key_achievements" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "skill_clusters" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "tone_preference" "text" DEFAULT 'professional'::"text" NOT NULL,
    "last_extracted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_context" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_context" IS 'Structured career knowledge graph built from CV/cert extraction. Cover letter generation reads from here.';



ALTER TABLE ONLY "public"."api_key_usage_logs"
    ADD CONSTRAINT "api_key_usage_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."automation_rules"
    ADD CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."certifications"
    ADD CONSTRAINT "certifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."certifications"
    ADD CONSTRAINT "certifications_storage_path_key" UNIQUE ("storage_path");



ALTER TABLE ONLY "public"."connected_email_accounts"
    ADD CONSTRAINT "connected_email_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cover_letters"
    ADD CONSTRAINT "cover_letters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interview_preps"
    ADD CONSTRAINT "interview_preps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_applications"
    ADD CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_applications"
    ADD CONSTRAINT "job_applications_user_id_job_id_key" UNIQUE ("user_id", "job_id");



ALTER TABLE ONLY "public"."job_vault"
    ADD CONSTRAINT "job_vault_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_vault"
    ADD CONSTRAINT "job_vault_user_id_dedup_hash_key" UNIQUE ("user_id", "dedup_hash");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resume_documents"
    ADD CONSTRAINT "resume_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resume_documents"
    ADD CONSTRAINT "resume_documents_storage_path_key" UNIQUE ("storage_path");



ALTER TABLE ONLY "public"."scrape_rate_limits"
    ADD CONSTRAINT "scrape_rate_limits_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."support_ticket_messages"
    ADD CONSTRAINT "support_ticket_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_api_keys"
    ADD CONSTRAINT "system_api_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usage_counters"
    ADD CONSTRAINT "usage_counters_pkey" PRIMARY KEY ("user_id", "counter_date");



ALTER TABLE ONLY "public"."user_api_keys"
    ADD CONSTRAINT "user_api_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_api_keys"
    ADD CONSTRAINT "user_api_keys_user_id_provider_key" UNIQUE ("user_id", "provider");



ALTER TABLE ONLY "public"."user_context"
    ADD CONSTRAINT "user_context_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_context"
    ADD CONSTRAINT "user_context_user_id_key" UNIQUE ("user_id");



CREATE INDEX "idx_api_key_usage_logs_created_at" ON "public"."api_key_usage_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_api_key_usage_logs_user_id" ON "public"."api_key_usage_logs" USING "btree" ("user_id");



CREATE INDEX "idx_certifications_user_id" ON "public"."certifications" USING "btree" ("user_id");



CREATE INDEX "idx_cover_letters_job_id" ON "public"."cover_letters" USING "btree" ("job_id");



CREATE INDEX "idx_cover_letters_user_id" ON "public"."cover_letters" USING "btree" ("user_id");



CREATE INDEX "idx_interview_preps_user_id" ON "public"."interview_preps" USING "btree" ("user_id");



CREATE INDEX "idx_job_applications_status" ON "public"."job_applications" USING "btree" ("status");



CREATE INDEX "idx_job_applications_user_id" ON "public"."job_applications" USING "btree" ("user_id");



CREATE INDEX "idx_job_vault_country" ON "public"."job_vault" USING "btree" ("country_code");



CREATE INDEX "idx_job_vault_dedup_hash" ON "public"."job_vault" USING "btree" ("dedup_hash");



CREATE INDEX "idx_job_vault_scraped_at" ON "public"."job_vault" USING "btree" ("scraped_at" DESC);



CREATE INDEX "idx_job_vault_source" ON "public"."job_vault" USING "btree" ("source");



CREATE INDEX "idx_job_vault_user_id" ON "public"."job_vault" USING "btree" ("user_id");



CREATE INDEX "idx_resume_documents_user_id" ON "public"."resume_documents" USING "btree" ("user_id");



CREATE INDEX "idx_support_tickets_user_id" ON "public"."support_tickets" USING "btree" ("user_id");



CREATE INDEX "idx_system_api_keys_priority" ON "public"."system_api_keys" USING "btree" ("provider", "priority_order") WHERE ("is_active" = true);



CREATE OR REPLACE TRIGGER "trg_cover_letters_updated_at" BEFORE UPDATE ON "public"."cover_letters" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_job_applications_updated_at" BEFORE UPDATE ON "public"."job_applications" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_support_tickets_updated_at" BEFORE UPDATE ON "public"."support_tickets" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_user_context_updated_at" BEFORE UPDATE ON "public"."user_context" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."api_key_usage_logs"
    ADD CONSTRAINT "api_key_usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."automation_rules"
    ADD CONSTRAINT "automation_rules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."certifications"
    ADD CONSTRAINT "certifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."connected_email_accounts"
    ADD CONSTRAINT "connected_email_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cover_letters"
    ADD CONSTRAINT "cover_letters_automation_rule_id_fkey" FOREIGN KEY ("automation_rule_id") REFERENCES "public"."automation_rules"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cover_letters"
    ADD CONSTRAINT "cover_letters_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."job_vault"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cover_letters"
    ADD CONSTRAINT "cover_letters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interview_preps"
    ADD CONSTRAINT "interview_preps_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."job_vault"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interview_preps"
    ADD CONSTRAINT "interview_preps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_applications"
    ADD CONSTRAINT "job_applications_cover_letter_used_fkey" FOREIGN KEY ("cover_letter_used") REFERENCES "public"."cover_letters"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."job_applications"
    ADD CONSTRAINT "job_applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."job_vault"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_applications"
    ADD CONSTRAINT "job_applications_resume_document_id_fkey" FOREIGN KEY ("resume_document_id") REFERENCES "public"."resume_documents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."job_applications"
    ADD CONSTRAINT "job_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_vault"
    ADD CONSTRAINT "job_vault_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resume_documents"
    ADD CONSTRAINT "resume_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scrape_rate_limits"
    ADD CONSTRAINT "scrape_rate_limits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_ticket_messages"
    ADD CONSTRAINT "support_ticket_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."support_ticket_messages"
    ADD CONSTRAINT "support_ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_api_keys"
    ADD CONSTRAINT "system_api_keys_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."usage_counters"
    ADD CONSTRAINT "usage_counters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_api_keys"
    ADD CONSTRAINT "user_api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_context"
    ADD CONSTRAINT "user_context_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "admin full access" ON "public"."profiles" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admin manage system keys" ON "public"."system_api_keys" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admin manage user api keys" ON "public"."user_api_keys" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admin read all api key usage" ON "public"."api_key_usage_logs" FOR SELECT USING ("public"."is_admin"());



ALTER TABLE "public"."api_key_usage_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."automation_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."certifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."connected_email_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cover_letters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."interview_preps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_vault" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "own logs select" ON "public"."api_key_usage_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "own rows all" ON "public"."automation_rules" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "own rows all" ON "public"."certifications" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "own rows all" ON "public"."connected_email_accounts" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "own rows all" ON "public"."cover_letters" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "own rows all" ON "public"."interview_preps" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "own rows all" ON "public"."job_applications" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "own rows all" ON "public"."job_vault" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "own rows all" ON "public"."resume_documents" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "own rows all" ON "public"."scrape_rate_limits" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "own rows all" ON "public"."support_tickets" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "own rows all" ON "public"."usage_counters" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "own rows all" ON "public"."user_context" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "own rows select" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "own rows update" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resume_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scrape_rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_ticket_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_tickets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_api_keys" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ticket owner insert" ON "public"."support_ticket_messages" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."support_tickets" "t"
  WHERE (("t"."id" = "support_ticket_messages"."ticket_id") AND ("t"."user_id" = "auth"."uid"())))));



CREATE POLICY "ticket participants select" ON "public"."support_ticket_messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."support_tickets" "t"
  WHERE (("t"."id" = "support_ticket_messages"."ticket_id") AND ("t"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."usage_counters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_api_keys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_context" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";































































































































































GRANT ALL ON FUNCTION "public"."admin_add_api_key"("p_provider" "public"."api_provider_enum", "p_api_key" "text", "p_label" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_add_api_key"("p_provider" "public"."api_provider_enum", "p_api_key" "text", "p_label" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_add_api_key"("p_provider" "public"."api_provider_enum", "p_api_key" "text", "p_label" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_delete_user"("target_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_delete_user"("target_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_delete_user"("target_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_list_api_keys"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_list_api_keys"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_list_api_keys"() TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_list_users"("p_page" integer, "p_page_size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_list_users"("p_page" integer, "p_page_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_list_users"("p_page" integer, "p_page_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_set_api_key_active"("p_key_id" "uuid", "p_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_set_api_key_active"("p_key_id" "uuid", "p_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_set_api_key_active"("p_key_id" "uuid", "p_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_and_increment_daily_applications"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_and_increment_daily_applications"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_and_increment_daily_applications"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."clear_my_api_key"("p_provider" "public"."api_provider_enum") TO "anon";
GRANT ALL ON FUNCTION "public"."clear_my_api_key"("p_provider" "public"."api_provider_enum") TO "authenticated";
GRANT ALL ON FUNCTION "public"."clear_my_api_key"("p_provider" "public"."api_provider_enum") TO "service_role";



GRANT ALL ON FUNCTION "public"."force_set_role"("target_email" "text", "target_role" "public"."user_role") TO "anon";
GRANT ALL ON FUNCTION "public"."force_set_role"("target_email" "text", "target_role" "public"."user_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."force_set_role"("target_email" "text", "target_role" "public"."user_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_dashboard_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_dashboard_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_dashboard_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_key_for_provider"("p_provider" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_key_for_provider"("p_provider" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_key_for_provider"("p_provider" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_key_for_provider"("p_user_id" "uuid", "p_provider" "public"."api_provider_enum") TO "anon";
GRANT ALL ON FUNCTION "public"."get_key_for_provider"("p_user_id" "uuid", "p_provider" "public"."api_provider_enum") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_key_for_provider"("p_user_id" "uuid", "p_provider" "public"."api_provider_enum") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_connected_email_accounts"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_connected_email_accounts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_connected_email_accounts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_pipeline_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_pipeline_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_pipeline_metrics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_self_privilege_escalation"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_self_privilege_escalation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_self_privilege_escalation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_role_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_role_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_role_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_key_pool"("p_user_id" "uuid", "p_provider" "public"."api_provider_enum") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_key_pool"("p_user_id" "uuid", "p_provider" "public"."api_provider_enum") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_key_pool"("p_user_id" "uuid", "p_provider" "public"."api_provider_enum") TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_key_pool"("p_provider" "public"."api_provider_enum", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_key_pool"("p_provider" "public"."api_provider_enum", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_key_pool"("p_provider" "public"."api_provider_enum", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_current_timestamp_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_current_timestamp_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_current_timestamp_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_my_api_key"("p_provider" "public"."api_provider_enum", "p_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_my_api_key"("p_provider" "public"."api_provider_enum", "p_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_my_api_key"("p_provider" "public"."api_provider_enum", "p_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_my_api_key"("p_provider" "public"."api_provider_enum", "p_api_key" "text", "p_label" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_my_api_key"("p_provider" "public"."api_provider_enum", "p_api_key" "text", "p_label" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_my_api_key"("p_provider" "public"."api_provider_enum", "p_api_key" "text", "p_label" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_primary_resume"("p_document_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_primary_resume"("p_document_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_primary_resume"("p_document_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_unlimited_applications_for_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_unlimited_applications_for_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_unlimited_applications_for_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ticket_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_ticket_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ticket_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



























GRANT ALL ON TABLE "public"."api_key_usage_logs" TO "anon";
GRANT ALL ON TABLE "public"."api_key_usage_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."api_key_usage_logs" TO "service_role";



GRANT ALL ON TABLE "public"."automation_rules" TO "anon";
GRANT ALL ON TABLE "public"."automation_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."automation_rules" TO "service_role";



GRANT ALL ON TABLE "public"."certifications" TO "anon";
GRANT ALL ON TABLE "public"."certifications" TO "authenticated";
GRANT ALL ON TABLE "public"."certifications" TO "service_role";



GRANT ALL ON TABLE "public"."connected_email_accounts" TO "anon";
GRANT ALL ON TABLE "public"."connected_email_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."connected_email_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."cover_letters" TO "anon";
GRANT ALL ON TABLE "public"."cover_letters" TO "authenticated";
GRANT ALL ON TABLE "public"."cover_letters" TO "service_role";



GRANT ALL ON TABLE "public"."interview_preps" TO "anon";
GRANT ALL ON TABLE "public"."interview_preps" TO "authenticated";
GRANT ALL ON TABLE "public"."interview_preps" TO "service_role";



GRANT ALL ON TABLE "public"."job_applications" TO "anon";
GRANT ALL ON TABLE "public"."job_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."job_applications" TO "service_role";



GRANT ALL ON TABLE "public"."job_vault" TO "anon";
GRANT ALL ON TABLE "public"."job_vault" TO "authenticated";
GRANT ALL ON TABLE "public"."job_vault" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."resume_documents" TO "anon";
GRANT ALL ON TABLE "public"."resume_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."resume_documents" TO "service_role";



GRANT ALL ON TABLE "public"."scrape_rate_limits" TO "anon";
GRANT ALL ON TABLE "public"."scrape_rate_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."scrape_rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."support_ticket_messages" TO "anon";
GRANT ALL ON TABLE "public"."support_ticket_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."support_ticket_messages" TO "service_role";



GRANT ALL ON TABLE "public"."support_tickets" TO "anon";
GRANT ALL ON TABLE "public"."support_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."support_tickets" TO "service_role";



GRANT ALL ON TABLE "public"."system_api_keys" TO "anon";
GRANT ALL ON TABLE "public"."system_api_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."system_api_keys" TO "service_role";



GRANT ALL ON TABLE "public"."usage_counters" TO "anon";
GRANT ALL ON TABLE "public"."usage_counters" TO "authenticated";
GRANT ALL ON TABLE "public"."usage_counters" TO "service_role";



GRANT ALL ON TABLE "public"."user_api_keys" TO "anon";
GRANT ALL ON TABLE "public"."user_api_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."user_api_keys" TO "service_role";



GRANT ALL ON TABLE "public"."user_context" TO "anon";
GRANT ALL ON TABLE "public"."user_context" TO "authenticated";
GRANT ALL ON TABLE "public"."user_context" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































