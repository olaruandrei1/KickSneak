-- ============================================================
-- KickSneak RBAC — Full Migration Script
-- Run as superuser (postgres) against kicksneak database
-- ============================================================

-- ----------------------------------------------
-- 1. CLEANUP — drop old roles if re-running
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

DO $$ 
DECLARE role_name text;
BEGIN
    FOR role_name IN SELECT unnest(ARRAY['ks_guest','ks_user','ks_seller','ks_admin','ks_chat_service','ks_owner'])
    LOOP
        IF EXISTS (SELECT FROM pg_roles WHERE rolname = role_name) THEN
            EXECUTE format('REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM %I', role_name);
            EXECUTE format('REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM %I', role_name);
            EXECUTE format('REVOKE USAGE ON SCHEMA public FROM %I', role_name);
            EXECUTE format('DROP OWNED BY %I', role_name);
            EXECUTE format('DROP ROLE %I', role_name);
        END IF;
    END LOOP;
END $$;

-- ----------------------------------------------
-- 2. CREATE ROLES
-- ----------------------------------------------

CREATE ROLE ks_guest LOGIN PASSWORD 'KsGuest2026!';
CREATE ROLE ks_user LOGIN PASSWORD 'KsUser2026!';
CREATE ROLE ks_seller LOGIN PASSWORD 'KsSeller2026!';
CREATE ROLE ks_admin LOGIN PASSWORD 'KsAdmin2026!';
CREATE ROLE ks_chat_service LOGIN PASSWORD 'KsChat2026!';
CREATE ROLE ks_owner LOGIN PASSWORD 'KsOwner2026!';

GRANT ks_guest TO ks_user;
GRANT ks_user TO ks_seller;
GRANT ks_guest, ks_user, ks_seller, ks_admin TO ks_owner;

GRANT CONNECT ON DATABASE kicksneak TO ks_guest, ks_user, ks_seller, ks_admin, ks_chat_service, ks_owner;
GRANT USAGE ON SCHEMA public TO ks_guest, ks_user, ks_seller, ks_admin, ks_chat_service, ks_owner;

-- ----------------------------------------------
-- 3. TABLE OWNERSHIP -> ks_owner
-- ----------------------------------------------

DO $$
DECLARE t text;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I OWNER TO ks_owner', t);
    END LOOP;
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
    notifications, webpush_subscriptions,
    auto_bids, product_viewed, roles
TO ks_user;

GRANT INSERT, UPDATE ON
    users, user_addresses, user_contacts, user_cart,
    user_favorites, "UserSizePreference",
    orders, returns, reviews, offers,
    bids, auto_bids, notifications,
    webpush_subscriptions, product_viewed
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
CREATE POLICY user_addresses_own ON user_addresses
    USING ("UserId"::text = current_setting('app.current_user_id', true) OR current_user IN ('ks_owner', 'ks_admin'));

ALTER TABLE user_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_contacts_own ON user_contacts
    USING ("UserId"::text = current_setting('app.current_user_id', true) OR current_user IN ('ks_owner', 'ks_admin'));

ALTER TABLE user_cart ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_cart_own ON user_cart
    USING ("UserId"::text = current_setting('app.current_user_id', true) OR current_user IN ('ks_owner', 'ks_admin'));

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_favorites_own ON user_favorites
    USING ("UserId"::text = current_setting('app.current_user_id', true) OR current_user IN ('ks_owner', 'ks_admin'));

ALTER TABLE "UserSizePreference" ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_size_pref_own ON "UserSizePreference"
    USING ("UserId"::text = current_setting('app.current_user_id', true) OR current_user IN ('ks_owner', 'ks_admin'));

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY orders_own ON orders
    USING ("BuyerId"::text = current_setting('app.current_user_id', true)
           OR current_user IN ('ks_owner', 'ks_seller', 'ks_admin', 'ks_chat_service'));

ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY returns_own ON returns
    USING ("UserId"::text = current_setting('app.current_user_id', true)
           OR current_user IN ('ks_owner', 'ks_seller', 'ks_admin', 'ks_chat_service'));

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_own ON notifications
    USING ("UserId"::text = current_setting('app.current_user_id', true) OR current_user IN ('ks_owner', 'ks_admin'));

ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY bids_read ON bids FOR SELECT USING (true);
CREATE POLICY bids_insert ON bids FOR INSERT
    WITH CHECK ("BidderId"::text = current_setting('app.current_user_id', true) OR current_user IN ('ks_owner', 'ks_admin'));
CREATE POLICY bids_update ON bids FOR UPDATE
    USING ("BidderId"::text = current_setting('app.current_user_id', true) OR current_user IN ('ks_owner', 'ks_admin'));

ALTER TABLE auto_bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY auto_bids_own ON auto_bids
    USING ("UserId"::text = current_setting('app.current_user_id', true) OR current_user IN ('ks_owner', 'ks_admin'));

ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY stock_items_read ON stock_items FOR SELECT USING (true);
CREATE POLICY stock_items_insert ON stock_items FOR INSERT
    WITH CHECK ("SellerId"::text = current_setting('app.current_user_id', true) OR current_user IN ('ks_owner', 'ks_admin'));
CREATE POLICY stock_items_update ON stock_items FOR UPDATE
    USING ("SellerId"::text = current_setting('app.current_user_id', true) OR current_user IN ('ks_owner', 'ks_admin'));

ALTER TABLE used_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY used_items_read ON used_items FOR SELECT USING (true);
CREATE POLICY used_items_insert ON used_items FOR INSERT
    WITH CHECK ("SellerId"::text = current_setting('app.current_user_id', true) OR current_user IN ('ks_owner', 'ks_admin'));
CREATE POLICY used_items_update ON used_items FOR UPDATE
    USING ("SellerId"::text = current_setting('app.current_user_id', true) OR current_user IN ('ks_owner', 'ks_admin'));

ALTER TABLE webpush_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY webpush_own ON webpush_subscriptions
    USING ("UserId"::text = current_setting('app.current_user_id', true) OR current_user IN ('ks_owner', 'ks_admin'));

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY reviews_read ON reviews FOR SELECT USING (true);
CREATE POLICY reviews_insert ON reviews FOR INSERT
    WITH CHECK ("BuyerId"::text = current_setting('app.current_user_id', true) OR current_user IN ('ks_owner', 'ks_admin'));

-- ----------------------------------------------
-- 11. LOCK DOWN EF MIGRATIONS
-- ----------------------------------------------

REVOKE ALL ON "__EFMigrationsHistory" FROM ks_guest, ks_user, ks_seller, ks_chat_service;
GRANT ALL ON "__EFMigrationsHistory" TO ks_admin;