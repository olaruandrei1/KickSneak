-- ============================================================
-- KickSneak RBAC � Full Migration Script
-- Run as superuser (postgres) against kicksneak database
-- ============================================================

-- ----------------------------------------------
-- 1. CLEANUP � idempotent reset of RLS + policies
--    (roles are NEVER dropped: DROP OWNED BY ks_owner
--     would drop every table it owns -> 42P01 on re-run)
-- ----------------------------------------------

DO $$
DECLARE t text;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

DO $$
DECLARE r record;
BEGIN
    FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- ----------------------------------------------
-- 2. CREATE ROLES (create-if-missing, never DROP+CREATE)
-- ----------------------------------------------

DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('ks_guest','KsGuest2026!'),
            ('ks_user','KsUser2026!'),
            ('ks_seller','KsSeller2026!'),
            ('ks_admin','KsAdmin2026!'),
            ('ks_chat_service','KsChat2026!'),
            ('ks_owner','KsOwner2026!')
        ) AS v(rolname, pwd)
    LOOP
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = r.rolname) THEN
            EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', r.rolname, r.pwd);
        END IF;
    END LOOP;
END $$;

GRANT ks_guest TO ks_user;
GRANT ks_user TO ks_seller;
GRANT ks_guest, ks_user, ks_seller, ks_admin TO ks_owner;

GRANT CONNECT ON DATABASE kicksneak TO ks_guest, ks_user, ks_seller, ks_admin, ks_chat_service, ks_owner;
GRANT USAGE ON SCHEMA public TO ks_guest, ks_user, ks_seller, ks_admin, ks_chat_service, ks_owner;

-- ----------------------------------------------
-- 3. TABLE OWNERSHIP -> ks_owner
-- ----------------------------------------------

-- chat_sessions/chat_messages stay owned by ks_chat_service (the Go chat service
-- runs its own migrations on them). Grabbing them here breaks that service (42501).
DO $$
DECLARE t text;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
             AND tablename NOT IN ('chat_sessions', 'chat_messages')
    LOOP
        EXECUTE format('ALTER TABLE %I OWNER TO ks_owner', t);
    END LOOP;
END $$;

-- Re-assert chat table ownership to ks_chat_service (fixes DBs where a prior run grabbed them).
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_sessions') THEN
        EXECUTE 'ALTER TABLE chat_sessions OWNER TO ks_chat_service';
        EXECUTE 'ALTER TABLE chat_messages OWNER TO ks_chat_service';
    END IF;
END $$;

DO $$
DECLARE s text;
BEGIN
    FOR s IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER SEQUENCE %I OWNER TO ks_owner', s);
    END LOOP;
END $$;

-- ----------------------------------------------
-- 4. GRANT ks_guest (public catalog, readonly)
-- ----------------------------------------------

GRANT SELECT ON
    products, product_photos, brands, categories,
    colors, materials, fits, genders, sizes, size_types,
    auctions, bids, stock_items, used_items, used_item_photos, sellers
TO ks_guest;

-- ----------------------------------------------
-- 5. GRANT ks_user (buyer operations)
-- ----------------------------------------------

GRANT SELECT ON
    users, user_addresses, user_contacts, user_cart,
    user_favorites, "UserSizePreference",
    orders, returns, reviews, offers,
    notifications, notification_settings, webpush_subscriptions,
    auto_bids, product_viewed, roles
TO ks_user;

GRANT INSERT, UPDATE ON
    users, user_addresses, user_contacts, user_cart,
    user_favorites, "UserSizePreference",
    orders, returns, reviews, offers,
    bids, auto_bids, notifications, notification_settings,
    webpush_subscriptions, product_viewed,
    sellers, auctions  -- seller enrollment: a buyer creates/edits their own seller profile
TO ks_user;

GRANT DELETE ON
    user_cart, user_favorites, webpush_subscriptions
TO ks_user;

-- ----------------------------------------------
-- 6. GRANT ks_seller (seller operations)
-- ----------------------------------------------

GRANT SELECT, INSERT, UPDATE ON
    sellers, stock_items, used_items, used_item_photos, auctions
TO ks_seller;

-- ----------------------------------------------
-- 7. GRANT ks_admin (full access)
-- ----------------------------------------------

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ks_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ks_admin;

ALTER DEFAULT PRIVILEGES FOR ROLE ks_owner IN SCHEMA public
    GRANT ALL PRIVILEGES ON TABLES TO ks_admin;
ALTER DEFAULT PRIVILEGES FOR ROLE ks_owner IN SCHEMA public
    GRANT ALL PRIVILEGES ON SEQUENCES TO ks_admin;

-- chat_sessions/chat_messages are created & owned by ks_chat_service (the Go
-- service), so they fall outside ks_owner's default privileges above. Without
-- this, the admin app (which connects as ks_admin) hits "permission denied for
-- table chat_sessions". Cover both future tables (default privileges) and any
-- that already exist (explicit grant in the DO block in section 8).
ALTER DEFAULT PRIVILEGES FOR ROLE ks_chat_service IN SCHEMA public
    GRANT ALL PRIVILEGES ON TABLES TO ks_admin;
ALTER DEFAULT PRIVILEGES FOR ROLE ks_chat_service IN SCHEMA public
    GRANT ALL PRIVILEGES ON SEQUENCES TO ks_admin;

-- ----------------------------------------------
-- 8. GRANT ks_chat_service (Go readonly + chat)
-- ----------------------------------------------

GRANT SELECT ON
    users, orders, returns, auctions, bids,
    products, product_photos, brands, categories,
    stock_items, used_items, sellers, sizes
TO ks_chat_service;

GRANT CREATE ON SCHEMA public TO ks_chat_service;

DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_sessions') THEN
        EXECUTE 'GRANT SELECT, INSERT, UPDATE ON chat_sessions, chat_messages TO ks_chat_service';
        -- Admin app reads/manages chat via ks_admin.
        EXECUTE 'GRANT ALL PRIVILEGES ON chat_sessions, chat_messages TO ks_admin';
    END IF;
END $$;

-- ----------------------------------------------
-- 9. SEQUENCES for INSERT operations
-- ----------------------------------------------

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ks_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ks_seller;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ks_chat_service;

-- ----------------------------------------------
-- 10. RLS POLICIES
-- ENABLE without FORCE = owner (ks_owner) bypasses RLS
-- Non-owner roles (ks_user, ks_seller via SET LOCAL ROLE) 
-- are subject to policies on writes
-- ----------------------------------------------

ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_addresses_own ON user_addresses;
CREATE POLICY user_addresses_own ON user_addresses
    USING ("UserId"::text = current_setting('app.current_user_id', true) OR current_user IN ('ks_owner', 'ks_admin'));

ALTER TABLE user_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_contacts_own ON user_contacts;
CREATE POLICY user_contacts_own ON user_contacts
    USING ("UserId"::text = current_setting('app.current_user_id', true) OR current_user IN ('ks_owner', 'ks_admin'));

ALTER TABLE user_cart ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_cart_own ON user_cart;
CREATE POLICY user_cart_own ON user_cart
    USING ("UserId"::text = current_setting('app.current_user_id', true) OR current_user IN ('ks_owner', 'ks_admin'));

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_favorites_own ON user_favorites;
CREATE POLICY user_favorites_own ON user_favorites
    USING ("UserId"::text = current_setting('app.current_user_id', true) OR current_user IN ('ks_owner', 'ks_admin'));

ALTER TABLE "UserSizePreference" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_size_pref_own ON "UserSizePreference";
CREATE POLICY user_size_pref_own ON "UserSizePreference"
    USING ("UserId"::text = current_setting('app.current_user_id', true) OR current_user IN ('ks_owner', 'ks_admin'));

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orders_own ON orders;
CREATE POLICY orders_own ON orders
    USING ("BuyerId"::text = current_setting('app.current_user_id', true)
           OR current_user IN ('ks_owner', 'ks_seller', 'ks_admin', 'ks_chat_service'));

ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS returns_own ON returns;
CREATE POLICY returns_own ON returns
    USING ("UserId"::text = current_setting('app.current_user_id', true)
           OR current_user IN ('ks_owner', 'ks_seller', 'ks_admin', 'ks_chat_service'));

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_own ON notifications;
CREATE POLICY notifications_own ON notifications
    USING ("UserId"::text = current_setting('app.current_user_id', true) OR current_user IN ('ks_owner', 'ks_admin'));

ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bids_read ON bids;
CREATE POLICY bids_read ON bids FOR SELECT USING (true);
DROP POLICY IF EXISTS bids_insert ON bids;
CREATE POLICY bids_insert ON bids FOR INSERT
    WITH CHECK ("BidderId"::text = current_setting('app.current_user_id', true) OR current_user IN ('ks_owner', 'ks_admin'));
DROP POLICY IF EXISTS bids_update ON bids;
CREATE POLICY bids_update ON bids FOR UPDATE
    USING ("BidderId"::text = current_setting('app.current_user_id', true) OR current_user IN ('ks_owner', 'ks_admin'));

ALTER TABLE auto_bids ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auto_bids_own ON auto_bids;
CREATE POLICY auto_bids_own ON auto_bids
    USING ("UserId"::text = current_setting('app.current_user_id', true) OR current_user IN ('ks_owner', 'ks_admin'));

ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stock_items_read ON stock_items;
CREATE POLICY stock_items_read ON stock_items FOR SELECT USING (true);
DROP POLICY IF EXISTS stock_items_insert ON stock_items;
CREATE POLICY stock_items_insert ON stock_items FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM sellers WHERE sellers."Id" = "SellerId" AND sellers."UserId"::text = current_setting('app.current_user_id', true)) OR current_user IN ('ks_owner', 'ks_admin'));
DROP POLICY IF EXISTS stock_items_update ON stock_items;
CREATE POLICY stock_items_update ON stock_items FOR UPDATE
    USING (EXISTS (SELECT 1 FROM sellers WHERE sellers."Id" = "SellerId" AND sellers."UserId"::text = current_setting('app.current_user_id', true)) OR current_user IN ('ks_owner', 'ks_admin'));

ALTER TABLE used_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS used_items_read ON used_items;
CREATE POLICY used_items_read ON used_items FOR SELECT USING (true);
DROP POLICY IF EXISTS used_items_insert ON used_items;
CREATE POLICY used_items_insert ON used_items FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM sellers WHERE sellers."Id" = "SellerId" AND sellers."UserId"::text = current_setting('app.current_user_id', true)) OR current_user IN ('ks_owner', 'ks_admin'));
DROP POLICY IF EXISTS used_items_update ON used_items;
CREATE POLICY used_items_update ON used_items FOR UPDATE
    USING (EXISTS (SELECT 1 FROM sellers WHERE sellers."Id" = "SellerId" AND sellers."UserId"::text = current_setting('app.current_user_id', true)) OR current_user IN ('ks_owner', 'ks_admin'));

ALTER TABLE webpush_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS webpush_own ON webpush_subscriptions;
CREATE POLICY webpush_own ON webpush_subscriptions
    USING ("UserId"::text = current_setting('app.current_user_id', true) OR current_user IN ('ks_owner', 'ks_admin'));

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reviews_read ON reviews;
CREATE POLICY reviews_read ON reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS reviews_insert ON reviews;
CREATE POLICY reviews_insert ON reviews FOR INSERT
    WITH CHECK ("BuyerId"::text = current_setting('app.current_user_id', true) OR current_user IN ('ks_owner', 'ks_admin'));

-- ----------------------------------------------
-- 11. LOCK DOWN EF MIGRATIONS
-- ----------------------------------------------

REVOKE ALL ON "__EFMigrationsHistory" FROM ks_guest, ks_user, ks_seller, ks_chat_service;
GRANT ALL ON "__EFMigrationsHistory" TO ks_admin;