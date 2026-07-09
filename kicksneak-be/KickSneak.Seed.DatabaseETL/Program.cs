using System.Text.Json;
using System.Text.Json.Serialization;
using Npgsql;

var connString = Environment.GetEnvironmentVariable("SEED_CONNECTION")
    ?? "Host=localhost;Port=5432;Database=kicksneak;Username=kicksneak_user;Password=KickSneak2026!";

var seedDir = Path.Combine(AppContext.BaseDirectory, "seed_data");
if (!Directory.Exists(seedDir))
    seedDir = Path.Combine(Directory.GetCurrentDirectory(), "seed_data");

if (!Directory.Exists(seedDir))
{
    Console.Error.WriteLine($"seed_data folder not found at {seedDir}");
    return;
}

var jsonOpts = new JsonSerializerOptions
{
    PropertyNameCaseInsensitive = true,
    NumberHandling = JsonNumberHandling.AllowReadingFromString
};

var esJsonOpts = new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
};
Log("Waiting 30s for backend migrations...");
await Task.Delay(TimeSpan.FromSeconds(30));

Log("KickSneak Seed ETL starting...");
Log($"DB: {connString.Split("Password")[0]}...");
Log($"Seed dir: {seedDir}");

await using var conn = new NpgsqlConnection(connString);
await conn.OpenAsync();

Log("Truncating tables...");
await Execute(conn, """
    TRUNCATE TABLE stock_items, used_items, used_item_photos, product_photos, 
    bids, auto_bids, auctions, orders, returns, reviews, offers, 
    user_cart, user_favorites, product_viewed, notifications,
    task_comments, tasks,
    sellers, users,
    products, sizes, size_types,
    brands, categories, colors, materials, genders, fits, roles
    CASCADE;

""");

await Execute(conn, "SET session_replication_role = 'replica';");
Log("FK checks disabled for seeding");

await Execute(conn, """
    ALTER TABLE sizes ALTER COLUMN "SizeLabel" TYPE varchar(100);
    ALTER TABLE sizes ALTER COLUMN "SizeUs" TYPE varchar(50);
    ALTER TABLE sizes ALTER COLUMN "SizeEu" TYPE varchar(50);
    ALTER TABLE sizes ALTER COLUMN "SizeUk" TYPE varchar(50);
""");
Log("Sizes columns widened");

await InsertLookup(conn, seedDir, "01_roles.json", "roles",
    r => new object[] { Guid(r, "Id"), Str(r, "Name"), Int(r, "Level"), false, Ts(r, "CreatedAt"), Str(r, "CreatedBy"), TsN(r, "ModifiedAt"), Str(r, "ModifiedBy") },
    """COPY roles ("Id","Name","Level","IsDeleted","CreatedAt","CreatedBy","ModifiedAt","ModifiedBy") FROM STDIN (FORMAT BINARY)""");

await InsertLookup(conn, seedDir, "02_brands.json", "brands",
    r => new object[] { Guid(r, "Id"), Str(r, "Name"), GuidN(r, "ParentId"), false, Ts(r, "CreatedAt"), Str(r, "CreatedBy"), TsN(r, "ModifiedAt"), Str(r, "ModifiedBy") },
    """COPY brands ("Id","Name","ParentId","IsDeleted","CreatedAt","CreatedBy","ModifiedAt","ModifiedBy") FROM STDIN (FORMAT BINARY)""");

await InsertLookup(conn, seedDir, "03_categories.json", "categories",
    r => new object[] { Guid(r, "Id"), Str(r, "Name"), GuidN(r, "ParentId"), false, Ts(r, "CreatedAt"), Str(r, "CreatedBy"), TsN(r, "ModifiedAt"), Str(r, "ModifiedBy") },
    """COPY categories ("Id","Name","ParentId","IsDeleted","CreatedAt","CreatedBy","ModifiedAt","ModifiedBy") FROM STDIN (FORMAT BINARY)""");

await InsertLookup(conn, seedDir, "04_colors.json", "colors",
    r => new object[] { Guid(r, "Id"), Str(r, "Name"), false, Ts(r, "CreatedAt"), Str(r, "CreatedBy"), TsN(r, "ModifiedAt"), Str(r, "ModifiedBy") },
    """COPY colors ("Id","Name","IsDeleted","CreatedAt","CreatedBy","ModifiedAt","ModifiedBy") FROM STDIN (FORMAT BINARY)""");

await InsertLookup(conn, seedDir, "05_materials.json", "materials",
    r => new object[] { Guid(r, "Id"), Str(r, "Name"), false, Ts(r, "CreatedAt"), Str(r, "CreatedBy"), TsN(r, "ModifiedAt"), Str(r, "ModifiedBy") },
    """COPY materials ("Id","Name","IsDeleted","CreatedAt","CreatedBy","ModifiedAt","ModifiedBy") FROM STDIN (FORMAT BINARY)""");

await InsertLookup(conn, seedDir, "06_fits.json", "fits",
    r => new object[] { Guid(r, "Id"), Str(r, "Name"), false, Ts(r, "CreatedAt"), Str(r, "CreatedBy"), TsN(r, "ModifiedAt"), Str(r, "ModifiedBy") },
    """COPY fits ("Id","Name","IsDeleted","CreatedAt","CreatedBy","ModifiedAt","ModifiedBy") FROM STDIN (FORMAT BINARY)""");

await InsertLookup(conn, seedDir, "07_genders.json", "genders",
    r => new object[] { Guid(r, "Id"), Str(r, "Name"), false, Ts(r, "CreatedAt"), Str(r, "CreatedBy"), TsN(r, "ModifiedAt"), Str(r, "ModifiedBy") },
    """COPY genders ("Id","Name","IsDeleted","CreatedAt","CreatedBy","ModifiedAt","ModifiedBy") FROM STDIN (FORMAT BINARY)""");

await InsertLookup(conn, seedDir, "08_size_types.json", "size_types",
    r => new object[] { Guid(r, "Id"), Str(r, "Name"), false, Ts(r, "CreatedAt"), Str(r, "CreatedBy"), TsN(r, "ModifiedAt"), Str(r, "ModifiedBy") },
    """COPY size_types ("Id","Name","IsDeleted","CreatedAt","CreatedBy","ModifiedAt","ModifiedBy") FROM STDIN (FORMAT BINARY)""");

await InsertLookup(conn, seedDir, "09_sizes.json", "sizes",
    r => new object[] { Guid(r, "Id"), Guid(r, "SizeTypeId"), Str(r, "SizeLabel"), Str(r, "SizeUs"), Str(r, "SizeEu"), Str(r, "SizeUk"), DblN(r, "SizeCm"), false, Ts(r, "CreatedAt"), Str(r, "CreatedBy"), TsN(r, "ModifiedAt"), Str(r, "ModifiedBy") },
    """COPY sizes ("Id","SizeTypeId","SizeLabel","SizeUs","SizeEu","SizeUk","SizeCm","IsDeleted","CreatedAt","CreatedBy","ModifiedAt","ModifiedBy") FROM STDIN (FORMAT BINARY)""");

// ── 2. Users + Sellers ──
await InsertLookup(conn, seedDir, "10_users.json", "users",
    r => new object[] { Guid(r, "Id"), Str(r, "FirebaseUid")!, Str(r, "FirstName"), Str(r, "LastName"), GuidN(r, "GenderId"), TsN(r, "BirthDate"), GuidN(r, "RoleId"), Str(r, "ProfilePhoto"), false, false, false, Ts(r, "CreatedAt"), Str(r, "CreatedBy"), TsN(r, "ModifiedAt"), Str(r, "ModifiedBy") },
    """COPY users ("Id","FirebaseUid","FirstName","LastName","GenderId","BirthDate","RoleId","ProfilePhoto","IsSuspended","IsBlocked","IsDeleted","CreatedAt","CreatedBy","ModifiedAt","ModifiedBy") FROM STDIN (FORMAT BINARY)""");

await InsertLookup(conn, seedDir, "11_sellers.json", "sellers",
    r => new object[] {
        Guid(r, "Id"), Guid(r, "UserId"), TsN(r, "EnrollmentDate"), false, false, Str(r, "Reason"),
        GuidN(r, "AffiliateId"), DblN(r, "TrustScore"), false, Ts(r, "CreatedAt"), Str(r, "CreatedBy"),
        TsN(r, "ModifiedAt"), Str(r, "ModifiedBy"),
        Str(r, "City"), Str(r, "CompanyName"), Bool(r, "HasCompany"), Str(r, "Phone"),
        Str(r, "ProductType"), Str(r, "SellType"), Str(r, "StoreName"), Str(r, "VatNumber")
    },
    """COPY sellers ("Id","UserId","EnrollmentDate","IsBlocked","IsSuspended","Reason","AffiliateId","TrustScore","IsDeleted","CreatedAt","CreatedBy","ModifiedAt","ModifiedBy","City","CompanyName","HasCompany","Phone","ProductType","SellType","StoreName","VatNumber") FROM STDIN (FORMAT BINARY)""");

// ── 3. Products + Photos (1000 files) ──
Log("Inserting products + photos...");
var productFiles = Directory.GetFiles(seedDir, "products_*.json").OrderBy(f => f).ToArray();
var productCount = 0;
var photoCount = 0;

foreach (var file in productFiles)
{
    var json = await File.ReadAllTextAsync(file);
    var doc = JsonSerializer.Deserialize<JsonElement>(json);

    if (doc.TryGetProperty("products", out var products))
    {
        foreach (var p in products.EnumerateArray())
        {
            await ExecuteInsert(conn, """
                INSERT INTO products ("Id","BrandId","CategoryId","GenderId","FitId","Title","ShortDescription","Description","MaterialId","ColorId","RetailPrice","ReleaseDate","ProductUniversalId","IsDeleted","CreatedAt","CreatedBy","ModifiedAt","ModifiedBy")
                VALUES (@id,@brandId,@categoryId,@genderId,@fitId,@title,@shortDesc,@desc,@materialId,@colorId,@retailPrice,@releaseDate,@sku,false,@createdAt,@createdBy,@modifiedAt,@modifiedBy)
                ON CONFLICT ("Id") DO NOTHING
            """, new Dictionary<string, object?>
            {
                ["id"] = Guid(p, "Id"),
                ["brandId"] = GuidN(p, "BrandId"),
                ["categoryId"] = GuidN(p, "CategoryId"),
                ["genderId"] = GuidN(p, "GenderId"),
                ["fitId"] = GuidN(p, "FitId"),
                ["title"] = Str(p, "Title"),
                ["shortDesc"] = Str(p, "ShortDescription"),
                ["desc"] = Str(p, "Description"),
                ["materialId"] = GuidN(p, "MaterialId"),
                ["colorId"] = GuidN(p, "ColorId"),
                ["retailPrice"] = DblN(p, "RetailPrice"),
                ["releaseDate"] = TsN(p, "ReleaseDate"),
                ["sku"] = Str(p, "ProductUniversalId"),
                ["createdAt"] = Ts(p, "CreatedAt"),
                ["createdBy"] = Str(p, "CreatedBy"),
                ["modifiedAt"] = TsN(p, "ModifiedAt"),
                ["modifiedBy"] = Str(p, "ModifiedBy"),
            });
            productCount++;
        }
    }

    if (doc.TryGetProperty("product_photos", out var photos))
    {
        foreach (var ph in photos.EnumerateArray())
        {
            var photoId = SafeGuid(ph, "Id"); // Regenerate if invalid
            await ExecuteInsert(conn, """
                INSERT INTO product_photos ("Id","ProductId","PhotoUrl","IsPrimary","DisplayOrder","IsDeleted","CreatedAt","CreatedBy","ModifiedAt","ModifiedBy")
                VALUES (@id,@productId,@url,@primary,@order,false,@createdAt,@createdBy,@modifiedAt,@modifiedBy)
                ON CONFLICT ("Id") DO NOTHING
            """, new Dictionary<string, object?>
            {
                ["id"] = photoId,
                ["productId"] = Guid(ph, "ProductId"),
                ["url"] = Str(ph, "PhotoUrl"),
                ["primary"] = Bool(ph, "IsPrimary"),
                ["order"] = IntN(ph, "DisplayOrder"),
                ["createdAt"] = Ts(ph, "CreatedAt"),
                ["createdBy"] = Str(ph, "CreatedBy"),
                ["modifiedAt"] = TsN(ph, "ModifiedAt"),
                ["modifiedBy"] = Str(ph, "ModifiedBy"),
            });
            photoCount++;
        }
    }

    if (productCount % 500 == 0)
        Log($"  Products: {productCount}, Photos: {photoCount} ({Path.GetFileName(file)})");
}
Log($"  Products total: {productCount}, Photos total: {photoCount}");

// ── 4. Stock Items (667 files) ──
Log("Inserting stock items...");
var stockFiles = Directory.GetFiles(seedDir, "stock_*.json").OrderBy(f => f).ToArray();
var stockCount = 0;

foreach (var file in stockFiles)
{
    var json = await File.ReadAllTextAsync(file);
    var items = JsonSerializer.Deserialize<JsonElement>(json);

    foreach (var s in items.EnumerateArray())
    {
        await ExecuteInsert(conn, """
            INSERT INTO stock_items ("Id","ProductId","SellerId","SizeId","Price","StatusItem","RefuseReason","IsDeleted","CreatedAt","CreatedBy","ModifiedAt","ModifiedBy")
            VALUES (@id,@productId,@sellerId,@sizeId,@price,@status,@reason,false,@createdAt,@createdBy,@modifiedAt,@modifiedBy)
            ON CONFLICT ("Id") DO NOTHING
        """, new Dictionary<string, object?>
        {
            ["id"] = SafeGuid(s, "Id"),
            ["productId"] = SafeGuid(s, "ProductId"),
            ["sellerId"] = SafeGuid(s, "SellerId"),
            ["sizeId"] = SafeGuid(s, "SizeId"),
            ["price"] = Dbl(s, "Price"),
            ["status"] = Int(s, "StatusItem"),
            ["reason"] = Str(s, "RefuseReason"),
            ["createdAt"] = Ts(s, "CreatedAt"),
            ["createdBy"] = Str(s, "CreatedBy"),
            ["modifiedAt"] = TsN(s, "ModifiedAt"),
            ["modifiedBy"] = Str(s, "ModifiedBy"),
        });
        stockCount++;
    }

    if (stockCount % 2000 == 0)
        Log($"  Stock items: {stockCount} ({Path.GetFileName(file)})");
}
Log($"  Stock items total: {stockCount}");

await Execute(conn, "SET session_replication_role = 'origin';"); 
Log("FK checks re-enabled");

Log("Fixing orphaned FK references...");

await Execute(conn, """
    UPDATE users SET "GenderId" = (SELECT "Id" FROM genders ORDER BY random() LIMIT 1)
    WHERE "GenderId" NOT IN (SELECT "Id" FROM genders) OR "GenderId" IS NULL
""");

await Execute(conn, """
    UPDATE users SET "RoleId" = (SELECT "Id" FROM roles WHERE "Name" = 'User' LIMIT 1)
    WHERE "RoleId" NOT IN (SELECT "Id" FROM roles) OR "RoleId" IS NULL
""");

await Execute(conn, """
    UPDATE stock_items SET "SizeId" = (SELECT "Id" FROM sizes ORDER BY random() LIMIT 1)
    WHERE "SizeId" NOT IN (SELECT "Id" FROM sizes)
""");

await Execute(conn, """
    UPDATE products SET "BrandId" = NULL WHERE "BrandId" NOT IN (SELECT "Id" FROM brands);
    UPDATE products SET "CategoryId" = NULL WHERE "CategoryId" NOT IN (SELECT "Id" FROM categories);
    UPDATE products SET "GenderId" = NULL WHERE "GenderId" NOT IN (SELECT "Id" FROM genders);
    UPDATE products SET "FitId" = NULL WHERE "FitId" NOT IN (SELECT "Id" FROM fits);
    UPDATE products SET "MaterialId" = NULL WHERE "MaterialId" NOT IN (SELECT "Id" FROM materials);
    UPDATE products SET "ColorId" = NULL WHERE "ColorId" NOT IN (SELECT "Id" FROM colors);
""");

await Execute(conn, """
    DELETE FROM stock_items WHERE "ProductId" NOT IN (SELECT "Id" FROM products);
    DELETE FROM stock_items WHERE "SellerId" NOT IN (SELECT "Id" FROM sellers);
""");

Log("FK references fixed");

// ── 4b. Generate baseline interactions (AI cold-start: views / favorites / orders) ──
// Set-based + referential-safe: only references existing users/products/stock rows.
// Makes the app "runnable on first key" with non-empty data for the recommender/reranker.
Log("Generating baseline interactions (views / favorites / orders)...");

await Execute(conn, """
    INSERT INTO product_viewed ("UserId", "ProductId", "ViewCount")
    SELECT u."Id", p."Id", (1 + floor(random() * 5))::int
    FROM users u
    CROSS JOIN LATERAL (
        SELECT "Id" FROM products WHERE "IsDeleted" = false ORDER BY random() LIMIT 20
    ) p
    ON CONFLICT DO NOTHING;
""");

await Execute(conn, """
    INSERT INTO user_favorites ("UserId", "ProductId", "IsDeleted", "CreatedAt")
    SELECT u."Id", p."Id", false, now()
    FROM users u
    CROSS JOIN LATERAL (
        SELECT "Id" FROM products WHERE "IsDeleted" = false ORDER BY random() LIMIT 8
    ) p
    ON CONFLICT DO NOTHING;
""");

// orders.StockItemId is UNIQUE (a unit sells once): pick DISTINCT active stock,
// assign each a random buyer via LATERAL (per-row eval), then mark those Sold.
await Execute(conn, """
    WITH picked AS (
        SELECT "Id", "Price" FROM stock_items
        WHERE "IsDeleted" = false AND "StatusItem" = 1
        ORDER BY random() LIMIT 1500
    ), ins AS (
        INSERT INTO orders ("Id", "BuyerId", "StockItemId", "Status", "TotalPrice", "IsDeleted", "CreatedAt", "CreatedBy")
        SELECT gen_random_uuid(), usr."Id", si."Id", 3, si."Price", false,
               now() - (random() * 180 || ' days')::interval, 'seed'
        FROM picked si
        CROSS JOIN LATERAL (SELECT "Id" FROM users WHERE "CreatedBy" = 'seed' ORDER BY random() LIMIT 1) usr
        RETURNING "StockItemId"
    )
    UPDATE stock_items SET "StatusItem" = 2
    WHERE "Id" IN (SELECT "StockItemId" FROM ins);
""");

Log("Generating auctions and bids...");
await Execute(conn, """
    WITH picked_auctions AS (
        SELECT "Id", "Price", "SellerId",
               (CASE WHEN random() > 0.5 THEN 1 ELSE 2 END) AS status,
               (floor(random() * 6) + 1)::int AS bid_count
        FROM stock_items
        WHERE "IsDeleted" = false AND "StatusItem" = 1
        ORDER BY random() LIMIT 500
    ), ins_auctions AS (
        INSERT INTO auctions ("Id", "StockItemId", "SellerId", "StartPrice", "CurrentPrice", "Status", "StartsAt", "EndsAt", "IsDeleted", "CreatedAt", "CreatedBy", "ReserveMet", "BidCount", "ExtensionCount")
        SELECT gen_random_uuid(), pa."Id", pa."SellerId",
               round((pa."Price" * 0.8)::numeric, 2),
               round((pa."Price" * (0.8 + random() * 0.5))::numeric, 2),
               pa.status,
               now() - ((random() * 25 + 1) || ' days')::interval,
               -- Active auctions must end in the future, ended ones in the past.
               CASE WHEN pa.status = 1
                    THEN now() + ((random() * 10 + 0.05) || ' days')::interval
                    ELSE now() - ((random() * 5 + 0.05) || ' days')::interval
               END,
               false, now(), 'seed', true, pa.bid_count, 0
        FROM picked_auctions pa
        RETURNING "Id", "StartPrice", "CurrentPrice", "StartsAt", "EndsAt", "BidCount", "StockItemId"
    ), ins_bids AS (
        -- Build a realistic ascending bid history: amounts interpolate from StartPrice
        -- up to CurrentPrice (the newest, highest bid), each placed by a random bot user
        -- (never the tester), timestamped in ascending order ending at the auction close.
        INSERT INTO bids ("Id", "AuctionId", "BidderId", "Amount", "PlacedAt", "IsDeleted", "CreatedAt", "CreatedBy", "IsAutoBid", "TriggeredExtension")
        SELECT gen_random_uuid(),
               a."Id",
               usr."Id",
               CASE WHEN a."BidCount" <= 1 THEN a."CurrentPrice"
                    ELSE round((a."StartPrice"
                        + (a."CurrentPrice" - a."StartPrice") * ((g.n - 1.0) / (a."BidCount" - 1.0)))::numeric, 2)
               END,
               LEAST(now(), a."EndsAt")
                    - ((a."BidCount" - g.n) * 6 || ' hours')::interval
                    - ((random() * 180) || ' minutes')::interval,
               false, now(), 'seed',
               (random() > 0.7),
               false
        FROM ins_auctions a
        CROSS JOIN LATERAL generate_series(1, a."BidCount") AS g(n)
        CROSS JOIN LATERAL (SELECT "Id" FROM users WHERE "CreatedBy" = 'seed' ORDER BY random() LIMIT 1) usr
    )
    UPDATE stock_items SET "StatusItem" = 3
    WHERE "Id" IN (SELECT "StockItemId" FROM ins_auctions);
""");

Log("Baseline interactions generated");

// ── 5. Bulk index products into Elasticsearch ──
Log("Indexing products into Elasticsearch...");
var elasticUrl = Environment.GetEnvironmentVariable("ELASTICSEARCH_URL") ?? "http://localhost:9200";
var httpClient = new HttpClient { BaseAddress = new Uri(elasticUrl), Timeout = TimeSpan.FromMinutes(5) };

// Ensure index exists
try
{
    var existsResp = await httpClient.GetAsync("/kicksneak-products");
    if (!existsResp.IsSuccessStatusCode)
    {
        await httpClient.PutAsync("/kicksneak-products", new StringContent("""
        {
            "settings": { "number_of_shards": 1, "number_of_replicas": 0 },
            "mappings": {
                "properties": {
                    "id": { "type": "keyword" },
                    "title": { "type": "text", "analyzer": "standard" },
                    "brand": { "type": "keyword" },
                    "category": { "type": "keyword" },
                    "color": { "type": "keyword" },
                    "material": { "type": "keyword" },
                    "gender": { "type": "keyword" },
                    "fit": { "type": "keyword" },
                    "retailPrice": { "type": "double" },
                    "lowestAsk": { "type": "double" },
                    "image": { "type": "keyword", "index": false },
                    "productUniversalId": { "type": "keyword" },
                    "shortDescription": { "type": "text" },
                    "soldCount": { "type": "integer" },
                    "isNew": { "type": "boolean" }
                }
            }
        }
        """, System.Text.Encoding.UTF8, "application/json"));
        Log("  Created Elasticsearch index");
    }

    var brandMap = new Dictionary<string, string>();
    var catMap = new Dictionary<string, string>();
    var colorMap = new Dictionary<string, string>();
    var materialMap = new Dictionary<string, string>();
    var genderMap = new Dictionary<string, string>();
    var fitMap = new Dictionary<string, string>();

    await using var lookupCmd = new NpgsqlCommand("""
        SELECT 'brand' as t, "Id"::text, "Name" FROM brands WHERE "IsDeleted" = false
        UNION ALL SELECT 'cat', "Id"::text, "Name" FROM categories WHERE "IsDeleted" = false
        UNION ALL SELECT 'color', "Id"::text, "Name" FROM colors WHERE "IsDeleted" = false
        UNION ALL SELECT 'material', "Id"::text, "Name" FROM materials WHERE "IsDeleted" = false
        UNION ALL SELECT 'gender', "Id"::text, "Name" FROM genders WHERE "IsDeleted" = false
        UNION ALL SELECT 'fit', "Id"::text, "Name" FROM fits WHERE "IsDeleted" = false
    """, conn);
    await using var reader = await lookupCmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        var type = reader.GetString(0);
        var id = reader.GetString(1);
        var name = reader.IsDBNull(2) ? "" : reader.GetString(2);
        switch (type)
        {
            case "brand": brandMap[id] = name; break;
            case "cat": catMap[id] = name; break;
            case "color": colorMap[id] = name; break;
            case "material": materialMap[id] = name; break;
            case "gender": genderMap[id] = name; break;
            case "fit": fitMap[id] = name; break;
        }
    }
    await reader.CloseAsync();

    var bulkCount = 0;
    await using var prodCmd = new NpgsqlCommand("""
        SELECT p."Id", p."Title", p."BrandId", p."CategoryId", p."ColorId", p."MaterialId", 
               p."GenderId", p."FitId", p."RetailPrice", p."ProductUniversalId", p."ShortDescription",
               p."ReleaseDate",
               (SELECT ph."PhotoUrl" FROM product_photos ph WHERE ph."ProductId" = p."Id" AND ph."IsPrimary" = true LIMIT 1) as "Image",
               (SELECT COUNT(*) FROM stock_items si WHERE si."ProductId" = p."Id" AND si."StatusItem" = 2) as "SoldCount",
               (SELECT MIN(si."Price") FROM stock_items si WHERE si."ProductId" = p."Id" AND si."StatusItem" = 1) as "LowestAsk"
        FROM products p WHERE p."IsDeleted" = false
    """, conn);
    prodCmd.CommandTimeout = 300;
    await using var prodReader = await prodCmd.ExecuteReaderAsync();

    var bulkBody = new System.Text.StringBuilder();
    var batchSize = 0;

    while (await prodReader.ReadAsync())
    {
        var id = prodReader.GetGuid(0).ToString();
        var title = prodReader.IsDBNull(1) ? "" : prodReader.GetString(1);
        var brandId = prodReader.IsDBNull(2) ? "" : prodReader.GetGuid(2).ToString();
        var catId = prodReader.IsDBNull(3) ? "" : prodReader.GetGuid(3).ToString();
        var colorId = prodReader.IsDBNull(4) ? "" : prodReader.GetGuid(4).ToString();
        var materialId = prodReader.IsDBNull(5) ? "" : prodReader.GetGuid(5).ToString();
        var genderId = prodReader.IsDBNull(6) ? "" : prodReader.GetGuid(6).ToString();
        var fitId = prodReader.IsDBNull(7) ? "" : prodReader.GetGuid(7).ToString();
        var retailPrice = prodReader.IsDBNull(8) ? 0.0 : prodReader.GetDouble(8);
        var sku = prodReader.IsDBNull(9) ? "" : prodReader.GetString(9);
        var shortDesc = prodReader.IsDBNull(10) ? "" : prodReader.GetString(10);
        var releaseDate = prodReader.IsDBNull(11) ? (DateTime?)null : prodReader.GetDateTime(11);
        var image = prodReader.IsDBNull(12) ? "" : prodReader.GetString(12);
        var soldCount = prodReader.IsDBNull(13) ? 0 : prodReader.GetInt64(13);
        var lowestAsk = prodReader.IsDBNull(14) ? 0.0 : prodReader.GetDouble(14);

        var brand = brandMap.GetValueOrDefault(brandId, "");
        var cat = catMap.GetValueOrDefault(catId, "");
        var color = colorMap.GetValueOrDefault(colorId, "");
        var material = materialMap.GetValueOrDefault(materialId, "");
        var gender = genderMap.GetValueOrDefault(genderId, "");
        var fit = fitMap.GetValueOrDefault(fitId, "");
        var isNew = releaseDate.HasValue && releaseDate.Value >= DateTime.UtcNow.AddMonths(-3);

        bulkBody.AppendLine("{\"index\":{\"_index\":\"kicksneak-products\",\"_id\":\"" + id + "\"}}");
        bulkBody.AppendLine(JsonSerializer.Serialize(new
        {
            Id = id,
            Title = title,
            Brand = brand,
            Category = cat,
            Color = color,
            Material = material,
            Gender = gender,
            Fit = fit,
            RetailPrice = retailPrice,
            LowestAsk = lowestAsk == 0 ? retailPrice : lowestAsk,
            Image = image,
            ProductUniversalId = sku,
            ShortDescription = shortDesc,
            SoldCount = (int)soldCount,
            IsNew = isNew,
            ReleaseDate = releaseDate,
            IndexedAt = DateTime.UtcNow
        }, esJsonOpts));

        batchSize++;
        if (batchSize >= 500)
        {
            await SendBulk(httpClient, bulkBody.ToString());
            bulkCount += batchSize;
            bulkBody.Clear();
            batchSize = 0;
            if (bulkCount % 2000 == 0)
                Log($"  Indexed {bulkCount} products...");
        }
    }
    await prodReader.CloseAsync();

    if (batchSize > 0)
    {
        await SendBulk(httpClient, bulkBody.ToString());
        bulkCount += batchSize;
    }

    Log($"  Elasticsearch: {bulkCount} products indexed");
}
catch (Exception ex)
{
    Log($"  Elasticsearch indexing failed: {ex.Message}");
    Log("  (Elastic will be populated by ElasticInitJob at backend startup)");
}

// ── Done ──
Log("═══════════════════════════════════════");
Log($"Seed complete!");
Log($"  Roles, Brands, Categories, Colors, Materials, Fits, Genders, SizeTypes, Sizes");
Log($"  Users + Sellers");
Log($"  Products: {productCount}");
Log($"  Photos: {photoCount}");
Log($"  Stock Items: {stockCount}");
Log("═══════════════════════════════════════");

// ══════════════════════════════════════════════════════════════
// Helper methods
// ══════════════════════════════════════════════════════════════

async Task InsertLookup(NpgsqlConnection c, string dir, string fileName, string tableName,
    Func<JsonElement, object[]> rowMapper, string copyCmd)
{
    var path = Path.Combine(dir, fileName);
    if (!File.Exists(path)) { Log($"  SKIP {fileName} (not found)"); return; }

    var json = await File.ReadAllTextAsync(path);
    var arr = JsonSerializer.Deserialize<JsonElement>(json);
    var count = 0;

    foreach (var row in arr.EnumerateArray())
    {
        try
        {
            var values = rowMapper(row);
            var paramNames = Enumerable.Range(0, values.Length).Select(i => $"@p{i}").ToArray();
            var sql = $"INSERT INTO {tableName} VALUES ({string.Join(",", paramNames)}) ON CONFLICT DO NOTHING";
            await using var cmd = new NpgsqlCommand(sql, c);
            for (int i = 0; i < values.Length; i++)
                cmd.Parameters.AddWithValue($"p{i}", values[i] ?? DBNull.Value);
            await cmd.ExecuteNonQueryAsync();
            count++;
        }
        catch (Exception ex)
        {
            Log($"  WARN {tableName} row skip: {ex.Message}");
        }
    }

    Log($"  {tableName}: {count} rows from {fileName}");
}

async Task ExecuteInsert(NpgsqlConnection c, string sql, Dictionary<string, object?> parms)
{
    try
    {
        await using var cmd = new NpgsqlCommand(sql, c);
        foreach (var (k, v) in parms)
            cmd.Parameters.AddWithValue(k, v ?? DBNull.Value);
        await cmd.ExecuteNonQueryAsync();
    }
    catch (Exception ex)
    {
        // Skip individual row errors (bad FK refs, etc.)
        if (!ex.Message.Contains("duplicate") && !ex.Message.Contains("violates"))
            Log($"  WARN insert skip: {ex.Message[..Math.Min(ex.Message.Length, 100)]}");
    }
}

async Task Execute(NpgsqlConnection c, string sql)
{
    await using var cmd = new NpgsqlCommand(sql, c);
    cmd.CommandTimeout = 120;
    await cmd.ExecuteNonQueryAsync();
}

// ── JSON extractors with GUID validation ──

Guid Guid(JsonElement e, string prop)
{
    var s = e.GetProperty(prop).GetString() ?? "";
    return System.Guid.TryParse(s, out var g) ? g : System.Guid.NewGuid();
}

Guid? GuidN(JsonElement e, string prop)
{
    if (!e.TryGetProperty(prop, out var v) || v.ValueKind == JsonValueKind.Null) return null;
    var s = v.GetString() ?? "";
    return System.Guid.TryParse(s, out var g) ? g : null;
}

Guid SafeGuid(JsonElement e, string prop)
{
    var s = e.GetProperty(prop).GetString() ?? "";
    return System.Guid.TryParse(s, out var g) ? g : System.Guid.NewGuid();
}

string? Str(JsonElement e, string prop)
{
    if (!e.TryGetProperty(prop, out var v) || v.ValueKind == JsonValueKind.Null) return null;
    return v.GetString();
}

int Int(JsonElement e, string prop) =>
    e.TryGetProperty(prop, out var v) ? v.GetInt32() : 0;

int? IntN(JsonElement e, string prop)
{
    if (!e.TryGetProperty(prop, out var v) || v.ValueKind == JsonValueKind.Null) return null;
    return v.GetInt32();
}

double Dbl(JsonElement e, string prop) =>
    e.TryGetProperty(prop, out var v) ? v.GetDouble() : 0;

double? DblN(JsonElement e, string prop)
{
    if (!e.TryGetProperty(prop, out var v) || v.ValueKind == JsonValueKind.Null) return null;
    return v.GetDouble();
}

bool Bool(JsonElement e, string prop) =>
    e.TryGetProperty(prop, out var v) && v.GetBoolean();

DateTime Ts(JsonElement e, string prop) =>
    e.TryGetProperty(prop, out var v) && DateTime.TryParse(v.GetString(), out var dt) ? dt : DateTime.UtcNow;

DateTime? TsN(JsonElement e, string prop)
{
    if (!e.TryGetProperty(prop, out var v) || v.ValueKind == JsonValueKind.Null) return null;
    return DateTime.TryParse(v.GetString(), out var dt) ? dt : null;
}

void Log(string msg) => Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] {msg}");

async Task SendBulk(HttpClient client, string body)
{
    var content = new StringContent(body, System.Text.Encoding.UTF8, "application/x-ndjson");
    var resp = await client.PostAsync("/_bulk", content);
    if (!resp.IsSuccessStatusCode)
    {
        var err = await resp.Content.ReadAsStringAsync();
        Log($"  WARN bulk index error: {err[..Math.Min(err.Length, 200)]}");
    }
}
