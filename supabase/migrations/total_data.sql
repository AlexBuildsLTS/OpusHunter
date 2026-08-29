SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict hqj00jLIbsJl9Q3YmRHVCScC94SFujcpO12iXTo80Hg5tzuuINvSJ6HOIrde9Jm

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") FROM stdin;
\.


--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."custom_oauth_providers" ("id", "provider_type", "identifier", "name", "client_id", "client_secret", "acceptable_client_ids", "scopes", "pkce_enabled", "attribute_mapping", "authorization_params", "enabled", "email_optional", "issuer", "discovery_url", "skip_nonce_check", "cached_discovery", "discovery_cached_at", "authorization_url", "token_url", "userinfo_url", "jwks_uri", "created_at", "updated_at", "custom_claims_allowlist") FROM stdin;
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."flow_state" ("id", "user_id", "auth_code", "code_challenge_method", "code_challenge", "provider_type", "provider_access_token", "provider_refresh_token", "created_at", "updated_at", "authentication_method", "auth_code_issued_at", "invite_token", "referrer", "oauth_client_state_id", "linking_target_id", "email_optional") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") FROM stdin;
00000000-0000-0000-0000-000000000000	dadcd58e-60f3-4a09-a11b-db1a32726a51	authenticated	authenticated	johndoe@gmail.com	$2a$10$4/g7GIEDt4pt574gOQa/sOJnX8WpZXP8HY.0LoOe5GdI0LmcaUEue	2026-07-03 12:21:18.742194+00	\N		\N		\N			\N	2026-08-27 02:05:05.801789+00	{"provider": "email", "providers": ["email"]}	{"sub": "dadcd58e-60f3-4a09-a11b-db1a32726a51", "email": "johndoe@gmail.com", "full_name": "John Doe", "email_verified": true, "phone_verified": false}	\N	2026-07-03 12:21:18.666134+00	2026-08-27 03:34:33.679283+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	7fd2f36d-64f8-41b6-abb0-2c3d65634db5	authenticated	authenticated	wunna@gmail.com	$2a$10$WoQ4xqoUlpURfgktAQNw9OtJZlJBSGk9y6Tv.ZnEMjm/GbmfZ0RTO	2026-08-27 23:56:32.262339+00	\N		\N		\N			\N	2026-08-27 23:56:32.271943+00	{"provider": "email", "providers": ["email"]}	{"sub": "7fd2f36d-64f8-41b6-abb0-2c3d65634db5", "email": "wunna@gmail.com", "full_name": "testerrifle", "email_verified": true, "phone_verified": false}	\N	2026-08-27 23:56:32.224871+00	2026-08-28 01:45:30.526407+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	authenticated	authenticated	admin@gmail.com	$2a$10$IcLkMYZm6VosG4d7lP7A6.EMUdyQxrDg10pVYaXWI2ev1W/vHrv4C	2026-06-29 09:44:38.955257+00	\N		\N		\N			\N	2026-08-28 17:42:15.121656+00	{"provider": "email", "providers": ["email"]}	{"sub": "d6cb0407-093c-4991-9b44-9e2fc9e5d68c", "email": "admin@gmail.com", "full_name": "localhost", "email_verified": true, "phone_verified": false}	\N	2026-06-29 09:44:38.916835+00	2026-08-28 17:42:15.133933+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	8d8a7d92-21b9-419b-be57-cf4ca201443d	authenticated	authenticated	rest@gmail.com	$2a$10$uVg5YazOTDJt/Lq1TMOou.M0k0DV3PMurREIYjvFLEiTD68CYnvMK	2026-08-20 15:39:13.880475+00	\N		\N		\N			\N	2026-08-20 15:39:13.888686+00	{"provider": "email", "providers": ["email"]}	{"sub": "8d8a7d92-21b9-419b-be57-cf4ca201443d", "email": "rest@gmail.com", "full_name": "test", "email_verified": true, "phone_verified": false}	\N	2026-08-20 15:39:13.819405+00	2026-08-20 15:39:13.916727+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") FROM stdin;
d6cb0407-093c-4991-9b44-9e2fc9e5d68c	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	{"sub": "d6cb0407-093c-4991-9b44-9e2fc9e5d68c", "email": "admin@gmail.com", "full_name": "localhost", "email_verified": false, "phone_verified": false}	email	2026-06-29 09:44:38.950042+00	2026-06-29 09:44:38.950091+00	2026-06-29 09:44:38.950091+00	abd0dae1-98e9-4218-8770-a23533c86bd2
dadcd58e-60f3-4a09-a11b-db1a32726a51	dadcd58e-60f3-4a09-a11b-db1a32726a51	{"sub": "dadcd58e-60f3-4a09-a11b-db1a32726a51", "email": "johndoe@gmail.com", "full_name": "John Doe", "email_verified": false, "phone_verified": false}	email	2026-07-03 12:21:18.734702+00	2026-07-03 12:21:18.734806+00	2026-07-03 12:21:18.734806+00	eeb6ba41-2710-4952-b315-0b13e2e1f6bd
8d8a7d92-21b9-419b-be57-cf4ca201443d	8d8a7d92-21b9-419b-be57-cf4ca201443d	{"sub": "8d8a7d92-21b9-419b-be57-cf4ca201443d", "email": "rest@gmail.com", "full_name": "test", "email_verified": false, "phone_verified": false}	email	2026-08-20 15:39:13.869374+00	2026-08-20 15:39:13.869429+00	2026-08-20 15:39:13.869429+00	e583c387-2f98-4de3-9b98-260457b9908e
7fd2f36d-64f8-41b6-abb0-2c3d65634db5	7fd2f36d-64f8-41b6-abb0-2c3d65634db5	{"sub": "7fd2f36d-64f8-41b6-abb0-2c3d65634db5", "email": "wunna@gmail.com", "full_name": "testerrifle", "email_verified": false, "phone_verified": false}	email	2026-08-27 23:56:32.256955+00	2026-08-27 23:56:32.257012+00	2026-08-27 23:56:32.257012+00	8fa30144-e8f8-4b4c-895e-a1d15fa6ce54
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."instances" ("id", "uuid", "raw_base_config", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_clients" ("id", "client_secret_hash", "registration_type", "redirect_uris", "grant_types", "client_name", "client_uri", "logo_uri", "created_at", "updated_at", "deleted_at", "client_type", "token_endpoint_auth_method") FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") FROM stdin;
384319f6-b064-4740-b93c-85290871c087	7fd2f36d-64f8-41b6-abb0-2c3d65634db5	2026-08-27 23:56:32.272068+00	2026-08-28 01:45:30.538611+00	\N	aal1	\N	2026-08-28 01:45:30.537943	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	188.150.171.239	\N	\N	\N	\N	\N
d1cb07b6-5376-4df0-b91b-1420307a359b	dadcd58e-60f3-4a09-a11b-db1a32726a51	2026-08-27 02:05:05.803122+00	2026-08-27 03:34:33.694891+00	\N	aal1	\N	2026-08-27 03:34:33.694787	Mozilla/5.0 (Android 16; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0	188.150.171.239	\N	\N	\N	\N	\N
dd49cb8b-1035-4ac6-98dd-c1f9f33c71a2	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	2026-08-28 17:23:08.155698+00	2026-08-28 17:23:08.155698+00	\N	aal1	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	188.150.171.239	\N	\N	\N	\N	\N
7deb061d-79d8-4b78-9e72-201ebfe9eb87	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	2026-08-28 17:42:15.121746+00	2026-08-28 17:42:15.121746+00	\N	aal1	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	188.150.171.239	\N	\N	\N	\N	\N
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") FROM stdin;
d1cb07b6-5376-4df0-b91b-1420307a359b	2026-08-27 02:05:05.827074+00	2026-08-27 02:05:05.827074+00	password	5781038e-86a3-43af-97a2-81dc46be466d
384319f6-b064-4740-b93c-85290871c087	2026-08-27 23:56:32.277962+00	2026-08-27 23:56:32.277962+00	password	056b73c4-0778-4bee-9d8d-5efe99318d41
dd49cb8b-1035-4ac6-98dd-c1f9f33c71a2	2026-08-28 17:23:08.20053+00	2026-08-28 17:23:08.20053+00	password	610f0f68-7b6d-4bfe-9705-d3b3723255d9
7deb061d-79d8-4b78-9e72-201ebfe9eb87	2026-08-28 17:42:15.135477+00	2026-08-28 17:42:15.135477+00	password	24497808-9755-43f6-855e-688884496b67
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_factors" ("id", "user_id", "friendly_name", "factor_type", "status", "created_at", "updated_at", "secret", "phone", "last_challenged_at", "web_authn_credential", "web_authn_aaguid", "last_webauthn_challenge_data") FROM stdin;
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_challenges" ("id", "factor_id", "created_at", "verified_at", "ip_address", "otp_code", "web_authn_session_data") FROM stdin;
\.


--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_authorizations" ("id", "authorization_id", "client_id", "user_id", "redirect_uri", "scope", "state", "resource", "code_challenge", "code_challenge_method", "response_type", "status", "authorization_code", "created_at", "expires_at", "approved_at", "nonce") FROM stdin;
\.


--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_client_states" ("id", "provider_type", "code_verifier", "created_at") FROM stdin;
\.


--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_consents" ("id", "user_id", "client_id", "scopes", "granted_at", "revoked_at") FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."one_time_tokens" ("id", "user_id", "token_type", "token_hash", "relates_to", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") FROM stdin;
00000000-0000-0000-0000-000000000000	349	6cpfvk3igurt	dadcd58e-60f3-4a09-a11b-db1a32726a51	t	2026-08-27 02:05:05.818091+00	2026-08-27 03:34:33.646831+00	\N	d1cb07b6-5376-4df0-b91b-1420307a359b
00000000-0000-0000-0000-000000000000	351	syeoo2tg6r5e	dadcd58e-60f3-4a09-a11b-db1a32726a51	f	2026-08-27 03:34:33.665516+00	2026-08-27 03:34:33.665516+00	6cpfvk3igurt	d1cb07b6-5376-4df0-b91b-1420307a359b
00000000-0000-0000-0000-000000000000	360	3kf7fmhziwy6	7fd2f36d-64f8-41b6-abb0-2c3d65634db5	t	2026-08-27 23:56:32.275328+00	2026-08-28 01:45:30.513619+00	\N	384319f6-b064-4740-b93c-85290871c087
00000000-0000-0000-0000-000000000000	366	yyt6od2lxtl6	7fd2f36d-64f8-41b6-abb0-2c3d65634db5	f	2026-08-28 01:45:30.519601+00	2026-08-28 01:45:30.519601+00	3kf7fmhziwy6	384319f6-b064-4740-b93c-85290871c087
00000000-0000-0000-0000-000000000000	376	n7oou4woxirc	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	f	2026-08-28 17:23:08.184627+00	2026-08-28 17:23:08.184627+00	\N	dd49cb8b-1035-4ac6-98dd-c1f9f33c71a2
00000000-0000-0000-0000-000000000000	377	yx4xgga6qow3	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	f	2026-08-28 17:42:15.130872+00	2026-08-28 17:42:15.130872+00	\N	7deb061d-79d8-4b78-9e72-201ebfe9eb87
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_providers" ("id", "resource_id", "created_at", "updated_at", "disabled") FROM stdin;
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_providers" ("id", "sso_provider_id", "entity_id", "metadata_xml", "metadata_url", "attribute_mapping", "created_at", "updated_at", "name_id_format") FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_relay_states" ("id", "sso_provider_id", "request_id", "for_email", "redirect_to", "created_at", "updated_at", "flow_state_id") FROM stdin;
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_domains" ("id", "sso_provider_id", "domain", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."webauthn_challenges" ("id", "user_id", "challenge_type", "session_data", "created_at", "expires_at") FROM stdin;
\.


--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."webauthn_credentials" ("id", "user_id", "credential_id", "public_key", "attestation_type", "aaguid", "sign_count", "transports", "backup_eligible", "backed_up", "friendly_name", "created_at", "updated_at", "last_used_at") FROM stdin;
\.


--
-- Data for Name: api_key_usage_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."api_key_usage_logs" ("id", "user_id", "provider", "key_source", "function_name", "strategy_used", "tokens_used", "cost_estimate_usd", "status_code", "success", "error_code", "created_at") FROM stdin;
\.


--
-- Data for Name: automation_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."automation_rules" ("id", "user_id", "keywords", "work_types", "experience_levels", "location", "latitude", "longitude", "max_distance_km", "remote_preference", "salary_min", "base_cover_letter", "is_active", "created_at") FROM stdin;
\.


--
-- Data for Name: certifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."certifications" ("id", "user_id", "file_name", "storage_path", "file_type", "file_size_kb", "cert_name", "cert_issuer", "cert_date", "cert_tags", "uploaded_at") FROM stdin;
6eeab382-5480-42af-a7dd-acb2d9128f03	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	javaFullStackDeveloperCertification.pdf	d6cb0407-093c-4991-9b44-9e2fc9e5d68c/certifications/1787874315726_javaFullStackDeveloperCertification.pdf	application/pdf	504	\N	\N	\N	{}	2026-08-27 23:45:13.232627+00
\.


--
-- Data for Name: connected_email_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."connected_email_accounts" ("id", "user_id", "provider", "email", "refresh_token", "scopes", "is_primary_sender", "connected_at", "created_at") FROM stdin;
\.


--
-- Data for Name: job_vault; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."job_vault" ("id", "user_id", "source", "external_job_id", "title", "company", "company_logo_url", "location", "country_code", "latitude", "longitude", "is_remote", "work_type", "salary", "salary_min", "salary_max", "currency", "description", "tech_stack", "match_score", "url", "source_url", "dedup_hash", "posted_at", "scraped_at") FROM stdin;
\.


--
-- Data for Name: cover_letters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."cover_letters" ("id", "user_id", "job_id", "company", "job_title", "title", "body", "strategy_used", "alternative_versions", "tone", "ats_score", "specificity_score", "filler_phrase_count", "generated_by", "tokens_used", "generation_duration_ms", "is_default", "user_edited", "automation_rule_id", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: interview_preps; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."interview_preps" ("id", "user_id", "job_id", "brief_markdown", "generated_at") FROM stdin;
\.


--
-- Data for Name: resume_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."resume_documents" ("id", "user_id", "file_name", "storage_path", "file_type", "file_size_kb", "label", "is_primary", "extraction_status", "uploaded_at") FROM stdin;
\.


--
-- Data for Name: job_applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."job_applications" ("id", "user_id", "job_id", "status", "cover_letter_used", "resume_document_id", "submission_method", "ats_provider", "sender_email", "sender_full_name", "submission_confirmation", "submission_error", "applied_at", "notes", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."profiles" ("id", "email", "first_name", "last_name", "avatar_url", "professional_title", "bio", "years_experience", "seniority_level", "target_roles", "work_type_preferences", "languages", "target_countries", "target_cities", "location_radius_km", "latitude", "longitude", "country_code", "salary_min", "salary_max", "salary_currency", "role", "profile_complete", "max_daily_applications", "gmail_linked_email", "last_scrape_time", "created_at", "updated_at") FROM stdin;
8d8a7d92-21b9-419b-be57-cf4ca201443d	rest@gmail.com	test	test	\N	\N	\N	\N	\N	{}	{}	{}	{}	{}	50	\N	\N	\N	\N	\N	SEK	member	f	10	\N	\N	2026-08-25 18:55:57.068747+00	2026-08-25 18:55:57.068747+00
dadcd58e-60f3-4a09-a11b-db1a32726a51	johndoe@gmail.com	John	Doe	https://zsqpcnqhfkzxgwexykex.supabase.co/storage/v1/object/public/avatars/dadcd58e-60f3-4a09-a11b-db1a32726a51/avatar.app/5fe49ca3-86ee-4444-98e4-db1260f34ccb?t=1787762975053	\N	\N	\N	\N	{}	{}	{}	{}	{}	50	\N	\N	\N	\N	\N	SEK	member	f	10	\N	\N	2026-08-25 18:55:57.068747+00	2026-08-26 16:49:35.327641+00
7fd2f36d-64f8-41b6-abb0-2c3d65634db5	wunna@gmail.com	testerrifle	\N	\N	\N	\N	\N	\N	{}	{}	{}	{}	{}	50	\N	\N	\N	\N	\N	SEK	member	f	10	\N	\N	2026-08-27 23:56:32.224517+00	2026-08-27 23:56:32.224517+00
d6cb0407-093c-4991-9b44-9e2fc9e5d68c	admin@gmail.com	localhost	localhost	https://zsqpcnqhfkzxgwexykex.supabase.co/storage/v1/object/public/avatars/d6cb0407-093c-4991-9b44-9e2fc9e5d68c/avatar.blob:http://localhost:8081/7773fb04-684a-4b04-b12f-dc00c171b880?t=1787792388268		\N	0	mid	{}	{remote}	{}	{Sweden}	{}	50	\N	\N	\N	\N	\N	SEK	admin	t	10	\N	\N	2026-08-25 18:55:57.068747+00	2026-08-28 02:29:09.725801+00
\.


--
-- Data for Name: scrape_rate_limits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."scrape_rate_limits" ("user_id", "last_scrape_at", "scrape_count_today", "reset_at") FROM stdin;
d6cb0407-093c-4991-9b44-9e2fc9e5d68c	2026-08-28 14:27:46.597+00	1	2026-08-29 14:27:46.597+00
\.


--
-- Data for Name: support_tickets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."support_tickets" ("id", "user_id", "subject", "description", "priority", "status", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: support_ticket_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."support_ticket_messages" ("id", "ticket_id", "sender_id", "message", "is_staff", "created_at") FROM stdin;
\.


--
-- Data for Name: system_api_keys; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."system_api_keys" ("id", "provider", "encrypted_key", "tier", "priority_order", "is_active", "label", "last_used_at", "throttled_until", "created_by", "created_at") FROM stdin;
\.


--
-- Data for Name: usage_counters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."usage_counters" ("user_id", "counter_date", "applications_count") FROM stdin;
\.


--
-- Data for Name: user_api_keys; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."user_api_keys" ("id", "user_id", "provider", "encrypted_key", "is_active", "created_at") FROM stdin;
\.


--
-- Data for Name: user_context; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."user_context" ("id", "user_id", "extracted_skills", "extracted_experience", "extracted_education", "extracted_certifications", "career_summary", "key_achievements", "skill_clusters", "tone_preference", "last_extracted_at", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type", "versioning_status") FROM stdin;
cv_vault	cv_vault	\N	2026-06-22 12:52:09.21849+00	2026-06-22 12:52:09.21849+00	f	f	\N	\N	\N	STANDARD	DISABLED
cv_payloads	cv_payloads	\N	2026-06-22 20:45:47.102798+00	2026-06-22 20:45:47.102798+00	f	f	20971520	{application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document}	\N	STANDARD	DISABLED
certifications	certifications	\N	2026-06-28 07:41:26.555603+00	2026-06-28 07:41:26.555603+00	f	f	20971520	{application/pdf,image/jpeg,image/png,image/webp}	\N	STANDARD	DISABLED
avatars	avatars	\N	2026-07-01 08:43:36.652719+00	2026-07-01 08:43:36.652719+00	t	f	\N	\N	\N	STANDARD	DISABLED
resumes	resumes	\N	2026-08-25 18:52:46.113058+00	2026-08-25 18:52:46.113058+00	f	f	10485760	{application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document}	\N	STANDARD	DISABLED
\.


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets_analytics" ("name", "type", "format", "created_at", "updated_at", "id", "deleted_at") FROM stdin;
\.


--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets_vectors" ("id", "type", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."objects" ("id", "bucket_id", "name", "owner", "created_at", "updated_at", "last_accessed_at", "metadata", "version", "owner_id", "user_metadata", "archived_at", "is_delete_marker", "is_versioned") FROM stdin;
cbf015e3-55fb-46e0-a8e3-73b92b5edb5d	cv_payloads	609aeeab-cbf9-463f-9ef2-0aa5cf5cdeb1/cv/1782504915861_AlexFYoussefCV.pdf	609aeeab-cbf9-463f-9ef2-0aa5cf5cdeb1	2026-06-26 20:15:16.81054+00	2026-06-26 20:15:16.81054+00	2026-06-26 20:15:16.81054+00	{"eTag": "\\"32e0f049448ce4136793f0ecb23402c9\\"", "size": 688495, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-06-26T20:15:17.000Z", "contentLength": 688495, "httpStatusCode": 200}	b52ce2d5-31a9-4eee-a735-2b040570be84	609aeeab-cbf9-463f-9ef2-0aa5cf5cdeb1	{}	\N	f	f
27334a8f-96a8-4c9c-aa07-4856b845df02	avatars	d6cb0407-093c-4991-9b44-9e2fc9e5d68c/avatar-1782895885180.blob:http:/localhost:8081/845dc70a-4513-4518-8e13-6fb9d0b7aff6	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	2026-07-01 08:51:25.364612+00	2026-07-01 08:51:25.364612+00	2026-07-01 08:51:25.364612+00	{"eTag": "\\"4fe2debac4ba3c28046f80eaa180ad6e\\"", "size": 17416, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-07-01T08:51:26.000Z", "contentLength": 17416, "httpStatusCode": 200}	a9d0bb71-69a1-408b-8c12-017923ac6409	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	{}	\N	f	f
9fba8fcd-0f64-4e3d-8148-f3d407e4577a	avatars	d6cb0407-093c-4991-9b44-9e2fc9e5d68c/avatar.blob:http:/localhost:8081/0c852a9a-1f5d-454c-8d66-856d9b18d659	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	2026-07-01 10:37:35.75974+00	2026-07-01 10:37:35.75974+00	2026-07-01 10:37:35.75974+00	{"eTag": "\\"251aeded283a150367590be9889b28ce\\"", "size": 4042, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-07-01T10:37:36.000Z", "contentLength": 4042, "httpStatusCode": 200}	b8ea18e1-d87f-404e-b121-da4d94300ab8	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	{}	\N	f	f
a3a81de3-0825-4e8b-a940-941c9d4e1999	cv_payloads	d6cb0407-093c-4991-9b44-9e2fc9e5d68c/cv/1782941168228_Alex-Youssef-CV.pdf	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	2026-07-01 21:26:08.857199+00	2026-07-01 21:26:08.857199+00	2026-07-01 21:26:08.857199+00	{"eTag": "\\"2322528d1da45d2b408dd8574048405d\\"", "size": 689067, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-07-01T21:26:09.000Z", "contentLength": 689067, "httpStatusCode": 200}	2f3f85b2-10e6-4cfd-bfa7-7d41263fa6a5	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	{}	\N	f	f
27a3f863-e49c-4db8-a19a-eb4e5b1bc8f1	cv_payloads	d6cb0407-093c-4991-9b44-9e2fc9e5d68c/certifications/1782941174034_JavaFullStack-Certification-Lexicon.pdf	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	2026-07-01 21:26:14.644573+00	2026-07-01 21:26:14.644573+00	2026-07-01 21:26:14.644573+00	{"eTag": "\\"cce265c65b304281cc83a651395820a6\\"", "size": 516096, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-07-01T21:26:15.000Z", "contentLength": 516096, "httpStatusCode": 200}	5d2b6743-65b8-48f0-b7c0-5b6946807e45	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	{}	\N	f	f
29be368f-6fa0-4f4c-a743-f9a1ae20aaba	avatars	d6cb0407-093c-4991-9b44-9e2fc9e5d68c/avatar.app/b580e8b5-5695-4903-8e14-3fc3d543abcb	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	2026-07-02 18:26:25.598985+00	2026-07-02 18:26:25.598985+00	2026-07-02 18:26:25.598985+00	{"eTag": "\\"39d9da26595e2d43edf3394b62103e31\\"", "size": 704162, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-07-02T18:26:26.000Z", "contentLength": 704162, "httpStatusCode": 200}	9998285e-aa4f-4afd-8431-3482b5fa5c5b	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	{}	\N	f	f
ee6d4048-75eb-4706-9968-60f88aabfb60	cv_vault	d6cb0407-093c-4991-9b44-9e2fc9e5d68c/cv.pdf	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	2026-07-02 18:27:43.483723+00	2026-07-02 18:28:08.956535+00	2026-07-02 18:27:43.483723+00	{"eTag": "\\"32e0f049448ce4136793f0ecb23402c9\\"", "size": 688495, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-07-02T18:28:09.000Z", "contentLength": 688495, "httpStatusCode": 200}	e13319db-78f2-4f55-a72b-24e8bd4c20fd	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	{}	\N	f	f
bc04934b-2937-42ca-b4de-e38044324698	avatars	d6cb0407-093c-4991-9b44-9e2fc9e5d68c/avatar.app/b38bd5f2-4527-4a52-9885-4d7a00813044	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	2026-07-02 23:04:35.020011+00	2026-07-02 23:04:35.020011+00	2026-07-02 23:04:35.020011+00	{"eTag": "\\"5f495b24b6d9c9261a695f9f9ac7c8f9\\"", "size": 202449, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-07-02T23:04:35.000Z", "contentLength": 202449, "httpStatusCode": 200}	8a0017e0-de50-40ee-bc50-feab39e08afc	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	{}	\N	f	f
06a0b190-078b-4c00-9030-171d00132f62	avatars	d6cb0407-093c-4991-9b44-9e2fc9e5d68c/avatar.app/95de462f-7a5a-4749-9717-3e0bb59feccb	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	2026-07-02 23:04:55.742617+00	2026-07-02 23:04:55.742617+00	2026-07-02 23:04:55.742617+00	{"eTag": "\\"3531f9368b8ee7709de83c0987b49cc5\\"", "size": 151578, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-07-02T23:04:56.000Z", "contentLength": 151578, "httpStatusCode": 200}	07af3564-a33e-4e5a-8ad6-a4f91511f803	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	{}	\N	f	f
4bd06b20-cc6f-497e-a68b-7bb1080fdc4f	avatars	d6cb0407-093c-4991-9b44-9e2fc9e5d68c/avatar.app/33f9b24b-67ce-4e0e-820d-98fd56877c53	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	2026-07-02 23:05:09.491281+00	2026-07-02 23:05:09.491281+00	2026-07-02 23:05:09.491281+00	{"eTag": "\\"a50dbecf4c451f67da86412946366278\\"", "size": 35500, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-07-02T23:05:10.000Z", "contentLength": 35500, "httpStatusCode": 200}	b2718592-73a7-4596-9d0e-add8091a1e85	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	{}	\N	f	f
4d4682f7-9ce3-44cc-a4ad-7995a116344e	avatars	dadcd58e-60f3-4a09-a11b-db1a32726a51/avatar.blob:http:/localhost:8081/79c57113-a6a0-4e4c-a19f-0e5981b9fb52	dadcd58e-60f3-4a09-a11b-db1a32726a51	2026-07-03 12:21:54.850147+00	2026-07-03 12:21:54.850147+00	2026-07-03 12:21:54.850147+00	{"eTag": "\\"13dea1e110a1f0b2ee70de28e4ae3db3\\"", "size": 10030, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-07-03T12:21:55.000Z", "contentLength": 10030, "httpStatusCode": 200}	856712d7-f2ce-4f07-a478-3b4b812e39b8	dadcd58e-60f3-4a09-a11b-db1a32726a51	{}	\N	f	f
85e08f8d-1510-4831-ba73-1edda906f615	cv_vault	dadcd58e-60f3-4a09-a11b-db1a32726a51/cv/1783105863778_Alex-Youssef-CV.pdf	dadcd58e-60f3-4a09-a11b-db1a32726a51	2026-07-03 19:11:05.047894+00	2026-07-03 19:11:05.047894+00	2026-07-03 19:11:05.047894+00	{"eTag": "\\"2322528d1da45d2b408dd8574048405d\\"", "size": 689067, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-07-03T19:11:05.000Z", "contentLength": 689067, "httpStatusCode": 200}	88f3159a-b67a-40f2-a500-39fa8e00db8e	dadcd58e-60f3-4a09-a11b-db1a32726a51	{}	\N	f	f
86841710-417e-4287-bec2-9d205c25a602	cv_vault	dadcd58e-60f3-4a09-a11b-db1a32726a51/certifications/1783105873266_JavaFullStack-Certification-Lexicon.pdf	dadcd58e-60f3-4a09-a11b-db1a32726a51	2026-07-03 19:11:14.00973+00	2026-07-03 19:11:14.00973+00	2026-07-03 19:11:14.00973+00	{"eTag": "\\"cce265c65b304281cc83a651395820a6\\"", "size": 516096, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-07-03T19:11:14.000Z", "contentLength": 516096, "httpStatusCode": 200}	4f87ef49-74b9-4bc6-a4b8-7366155120a8	dadcd58e-60f3-4a09-a11b-db1a32726a51	{}	\N	f	f
3b18b4e2-43e4-4ec3-acde-f368d6f37537	avatars	d6cb0407-093c-4991-9b44-9e2fc9e5d68c/avatar.blob:http:/localhost:8081/88be8180-92aa-4f28-a200-51e203418c44	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	2026-07-03 21:36:50.561909+00	2026-07-03 21:36:50.561909+00	2026-07-03 21:36:50.561909+00	{"eTag": "\\"9346d7577c4183b0a3d12ebe25704a6c\\"", "size": 21109, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-07-03T21:36:51.000Z", "contentLength": 21109, "httpStatusCode": 200}	f1b73bbb-d6e8-42fd-b116-32445868ed6d	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	{}	\N	f	f
f74e3ee8-6b50-439e-8863-aad089e239c5	cv_vault	d6cb0407-093c-4991-9b44-9e2fc9e5d68c/cv/1783825692536_CV-Alex-Youssef1.pdf	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	2026-07-12 03:08:12.298415+00	2026-07-12 03:08:12.298415+00	2026-07-12 03:08:12.298415+00	{"eTag": "\\"a6a1f2a31da864216e9f60059bc5e4c2\\"", "size": 505865, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-07-12T03:08:13.000Z", "contentLength": 505865, "httpStatusCode": 200}	3feb3071-4c59-4d46-a2a0-2635970a47a9	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	{}	\N	f	f
0ed5db80-3c11-4100-b814-f3921bba9319	cv_vault	d6cb0407-093c-4991-9b44-9e2fc9e5d68c/cv/1783992709846_AlexFYoussefCV.pdf	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	2026-07-14 01:31:50.66836+00	2026-07-14 01:31:50.66836+00	2026-07-14 01:31:50.66836+00	{"eTag": "\\"32e0f049448ce4136793f0ecb23402c9\\"", "size": 688495, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-07-14T01:31:51.000Z", "contentLength": 688495, "httpStatusCode": 200}	b1ed104d-c682-401d-a7ca-c2623089e3e2	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	{}	\N	f	f
6c157251-2723-4f15-8720-11639a5e941a	cv_vault	dadcd58e-60f3-4a09-a11b-db1a32726a51/cv/1786070649868_CV_-_Alex_Youssef_-_Fullstack.pdf	dadcd58e-60f3-4a09-a11b-db1a32726a51	2026-08-07 02:44:10.554372+00	2026-08-07 02:44:10.554372+00	2026-08-07 02:44:10.554372+00	{"eTag": "\\"f3581efcbb618bfd57c873d279c2552a\\"", "size": 504453, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-08-07T02:44:11.000Z", "contentLength": 504453, "httpStatusCode": 200}	e3433395-b45f-4cca-a21b-87176c74bcd6	dadcd58e-60f3-4a09-a11b-db1a32726a51	{}	\N	f	f
fab6573b-b3e3-4021-8183-2470e488c511	cv_vault	dadcd58e-60f3-4a09-a11b-db1a32726a51/cv/1786070666645_CV_-_Alex_Youssef_-_Fullstack.pdf	dadcd58e-60f3-4a09-a11b-db1a32726a51	2026-08-07 02:44:27.269856+00	2026-08-07 02:44:27.269856+00	2026-08-07 02:44:27.269856+00	{"eTag": "\\"f3581efcbb618bfd57c873d279c2552a\\"", "size": 504453, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-08-07T02:44:28.000Z", "contentLength": 504453, "httpStatusCode": 200}	1c631a82-f3b1-4a33-bc62-571abe0588ba	dadcd58e-60f3-4a09-a11b-db1a32726a51	{}	\N	f	f
7d9ed24b-e2d5-4ef5-a33c-b58bec9a376b	cv_vault	dadcd58e-60f3-4a09-a11b-db1a32726a51/certifications/1786070702184_certification_url_1765070215968.pdf	dadcd58e-60f3-4a09-a11b-db1a32726a51	2026-08-07 02:45:03.142092+00	2026-08-07 02:45:03.142092+00	2026-08-07 02:45:03.142092+00	{"eTag": "\\"cce265c65b304281cc83a651395820a6\\"", "size": 516096, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-08-07T02:45:04.000Z", "contentLength": 516096, "httpStatusCode": 200}	90d9d76d-94aa-40ac-ac41-b20ca0c8044f	dadcd58e-60f3-4a09-a11b-db1a32726a51	{}	\N	f	f
dc18196a-9c48-4f64-9457-eb160b846cf8	cv_vault	d6cb0407-093c-4991-9b44-9e2fc9e5d68c/cv/1787077060290_Alex_Youssef_-_CV.PDF	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	2026-08-18 18:17:40.931527+00	2026-08-18 18:17:40.931527+00	2026-08-18 18:17:40.931527+00	{"eTag": "\\"4b1af4735936b4c7be2ef115b1e813e6\\"", "size": 671571, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-08-18T18:17:41.000Z", "contentLength": 671571, "httpStatusCode": 200}	20c1317e-a3f5-4ab8-a083-fca39ad3b1b2	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	{}	\N	f	f
9d7a5d5b-52b1-4da4-af83-8b45bc81dbbc	cv_vault	d6cb0407-093c-4991-9b44-9e2fc9e5d68c/certifications/1787077068518_javaFullStackDeveloperCertification.pdf	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	2026-08-18 18:17:45.879829+00	2026-08-18 18:17:45.879829+00	2026-08-18 18:17:45.879829+00	{"eTag": "\\"cce265c65b304281cc83a651395820a6\\"", "size": 516096, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-08-18T18:17:46.000Z", "contentLength": 516096, "httpStatusCode": 200}	dc1708fa-d5c6-4c03-9bb3-55c3af633055	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	{}	\N	f	f
e23e19b2-317a-4a0b-bb46-afb574ee5d71	cv_vault	dadcd58e-60f3-4a09-a11b-db1a32726a51/cv/1787762925150_Alex_Fredrik_-_CV.PDF	dadcd58e-60f3-4a09-a11b-db1a32726a51	2026-08-26 16:48:45.908461+00	2026-08-26 16:48:45.908461+00	2026-08-26 16:48:45.908461+00	{"eTag": "\\"3203b4edfdd15e54a8f9116ac7025570\\"", "size": 683920, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-08-26T16:48:46.000Z", "contentLength": 683920, "httpStatusCode": 200}	08c52e82-24f1-4da4-9e14-3855bdc29839	dadcd58e-60f3-4a09-a11b-db1a32726a51	{}	\N	f	f
bd68e4c1-9562-4c05-ac9f-5b506cb9f3f2	avatars	dadcd58e-60f3-4a09-a11b-db1a32726a51/avatar.app/5fe49ca3-86ee-4444-98e4-db1260f34ccb	dadcd58e-60f3-4a09-a11b-db1a32726a51	2026-08-26 16:49:34.969331+00	2026-08-26 16:49:34.969331+00	2026-08-26 16:49:34.969331+00	{"eTag": "\\"e5c174d5e209e9ca8b89d0b4220435fa\\"", "size": 204705, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-08-26T16:49:35.000Z", "contentLength": 204705, "httpStatusCode": 200}	b7ec3f43-1d22-43af-805f-4bd3000b1cf8	dadcd58e-60f3-4a09-a11b-db1a32726a51	{}	\N	f	f
b161f318-c955-478c-9634-683349dac67d	cv_vault	dadcd58e-60f3-4a09-a11b-db1a32726a51/cv/1787787008544_Alex_Fredrik_-_CV.PDF	dadcd58e-60f3-4a09-a11b-db1a32726a51	2026-08-26 23:30:09.361431+00	2026-08-26 23:30:09.361431+00	2026-08-26 23:30:09.361431+00	{"eTag": "\\"3203b4edfdd15e54a8f9116ac7025570\\"", "size": 683920, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-08-26T23:30:10.000Z", "contentLength": 683920, "httpStatusCode": 200}	b74e44b5-9d4c-4a36-b618-b6f414ef5fdf	dadcd58e-60f3-4a09-a11b-db1a32726a51	{}	\N	f	f
724f6850-6d04-4e06-82dd-41984d48fc14	avatars	d6cb0407-093c-4991-9b44-9e2fc9e5d68c/avatar.blob:http:/localhost:8081/7773fb04-684a-4b04-b12f-dc00c171b880	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	2026-08-27 00:59:42.701888+00	2026-08-27 00:59:42.701888+00	2026-08-27 00:59:42.701888+00	{"eTag": "\\"5219f1cdfbcfd52fff4d119acb908b5f\\"", "size": 34963, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-08-27T00:59:43.000Z", "contentLength": 34963, "httpStatusCode": 200}	0822324c-28af-47ff-ab5e-1e62dcf3487b	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	{}	\N	f	f
230c6797-1cca-46dc-a47e-7d1d2d1dc719	cv_vault	d6cb0407-093c-4991-9b44-9e2fc9e5d68c/cv/1787874310254_Alex_Youssef_-_CV.PDF	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	2026-08-27 23:45:06.779033+00	2026-08-27 23:45:06.779033+00	2026-08-27 23:45:06.779033+00	{"eTag": "\\"4b1af4735936b4c7be2ef115b1e813e6\\"", "size": 671571, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-08-27T23:45:07.000Z", "contentLength": 671571, "httpStatusCode": 200}	8efd5f8d-35c0-4d61-84d1-a48b5740a64b	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	{}	\N	f	f
f716fbc0-f881-4abf-afb7-d19a2b18e717	cv_vault	d6cb0407-093c-4991-9b44-9e2fc9e5d68c/certifications/1787874315726_javaFullStackDeveloperCertification.pdf	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	2026-08-27 23:45:12.678681+00	2026-08-27 23:45:12.678681+00	2026-08-27 23:45:12.678681+00	{"eTag": "\\"cce265c65b304281cc83a651395820a6\\"", "size": 516096, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-08-27T23:45:13.000Z", "contentLength": 516096, "httpStatusCode": 200}	e8941052-c74b-478d-898c-6de66588e987	d6cb0407-093c-4991-9b44-9e2fc9e5d68c	{}	\N	f	f
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."s3_multipart_uploads" ("id", "in_progress_size", "upload_signature", "bucket_id", "key", "version", "owner_id", "created_at", "user_metadata", "metadata") FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."s3_multipart_uploads_parts" ("id", "upload_id", "size", "part_number", "bucket_id", "key", "etag", "owner_id", "version", "created_at") FROM stdin;
\.


--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."vector_indexes" ("id", "name", "bucket_id", "data_type", "dimension", "distance_metric", "metadata_configuration", "created_at", "updated_at") FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 377, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict hqj00jLIbsJl9Q3YmRHVCScC94SFujcpO12iXTo80Hg5tzuuINvSJ6HOIrde9Jm

RESET ALL;
