DROP POLICY IF EXISTS stock_items_insert ON stock_items;
CREATE POLICY stock_items_insert ON stock_items FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM sellers WHERE sellers."Id" = "SellerId" AND sellers."UserId"::text = current_setting('app.current_user_id', true)) OR current_user IN ('ks_owner', 'ks_admin'));

DROP POLICY IF EXISTS stock_items_update ON stock_items;
CREATE POLICY stock_items_update ON stock_items FOR UPDATE
    USING (EXISTS (SELECT 1 FROM sellers WHERE sellers."Id" = "SellerId" AND sellers."UserId"::text = current_setting('app.current_user_id', true)) OR current_user IN ('ks_owner', 'ks_admin'));

DROP POLICY IF EXISTS used_items_insert ON used_items;
CREATE POLICY used_items_insert ON used_items FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM sellers WHERE sellers."Id" = "SellerId" AND sellers."UserId"::text = current_setting('app.current_user_id', true)) OR current_user IN ('ks_owner', 'ks_admin'));

DROP POLICY IF EXISTS used_items_update ON used_items;
CREATE POLICY used_items_update ON used_items FOR UPDATE
    USING (EXISTS (SELECT 1 FROM sellers WHERE sellers."Id" = "SellerId" AND sellers."UserId"::text = current_setting('app.current_user_id', true)) OR current_user IN ('ks_owner', 'ks_admin'));
