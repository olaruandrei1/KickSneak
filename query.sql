UPDATE auctions SET "Status" = 1, "EndsAt" = now() + ((random() * 10 + 1) || ' days')::interval WHERE "Id" IN (SELECT "Id" FROM auctions ORDER BY random() LIMIT 250);
