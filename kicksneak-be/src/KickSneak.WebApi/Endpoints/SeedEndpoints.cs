using KickSneak.Domain.Entities.Catalog;
using KickSneak.Domain.Entities.Inventory;
using KickSneak.Domain.Entities.Sellers;
using KickSneak.Domain.Entities.Users;
using KickSneak.Domain.Enums;
using KickSneak.Persistence.Context;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Text.Json;

namespace KickSneak.WebApi.Endpoints;

public static class SeedEndpoints
{
    private static readonly string OllamaUrl =
        $"{Environment.GetEnvironmentVariable("OLLAMA_URL") ?? "http://localhost:11434"}/api/generate";

    private static readonly string OllamaModel =
        Environment.GetEnvironmentVariable("OLLAMA_MODEL") ?? "qwen2.5:7b";

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        UnmappedMemberHandling = System.Text.Json.Serialization.JsonUnmappedMemberHandling.Skip
    };

    public static void MapSeedEndpoints(this WebApplication app)
    {
        if (!app.Environment.IsDevelopment()) return;

        app.MapPost("/seed/all", SeedAll);
        app.MapDelete("/seed/reset", ResetDb);
    }

    private static async Task<IResult> SeedAll(AppDbContext db, IHttpClientFactory httpFactory)
    {
        var client = httpFactory.CreateClient();
        client.Timeout = TimeSpan.FromMinutes(30);

        List<string> log = [];

        if (!await db.Roles.AnyAsync())
        {
            await SeedBase(db);
            log.Add("Roles, Genders, Sizes seeded.");
        }
        else
            log.Add("Base already seeded.");

        if (!await db.Brands.AnyAsync())
        {
            var brands = await AskOllama<List<OllamaBrand>>(client, """
                Return a JSON array of exactly 20 sneaker brand names.
                Start with [ and end with ]
                Format: [{"name":"Nike"},{"name":"adidas"},{"name":"Air Jordan"}]
                Include: Nike, Air Jordan, adidas, Yeezy, New Balance, ASICS, Puma, Converse, Balenciaga, Gucci, OFF-WHITE, Dior, Supreme, BAPE, FOG Essentials, Travis Scott, Rick Owens, Salomon, Birkenstock, UGG
                Return ONLY the array. Nothing else.
            """);

            if (brands is not null)
            {
                await db.Brands.AddRangeAsync(brands.Select(b => new Brand { Name = b.Name }));
                await db.SaveChangesAsync();

                log.Add($"{brands.Count} brands seeded.");
            }
        }
        else
            log.Add("Brands already seeded.");

        if (!await db.Categories.AnyAsync())
        {
            var cats = await AskOllama<List<OllamaName>>(client, """
                Generate a list of product categories for a sneaker marketplace.
                Return ONLY a JSON array. No markdown. Start with [
                Each object: {"name": "Sneakers"}
                Include: Sneakers, Apparel, Accessories, Shoes, Collectibles, Trading Cards
                """);

            if (cats is not null)
            {
                await db.Categories.AddRangeAsync(cats.Select(c => new Category { Name = c.Name }));
                await db.SaveChangesAsync();

                log.Add($"{cats.Count} categories seeded.");
            }
        }
        else log.Add("Categories already seeded.");

        if (!await db.Colors.AnyAsync())
        {
            var colors = await AskOllama<List<OllamaName>>(client, """
                Generate a list of 15 common sneaker colorway colors.
                Return ONLY a JSON array. No markdown. Start with [
                Each object: {"name": "Black"}
                Include: Black, White, Red, Blue, Green, Grey, Brown, Beige, Multi, Yellow, Orange, Pink, Purple, Tan, Cream
                """);

            if (colors is not null)
            {
                await db.Colors.AddRangeAsync(colors.Select(c => new Color { Name = c.Name }));
                await db.SaveChangesAsync();
                log.Add($"{colors.Count} colors seeded.");
            }
        }
        else log.Add("Colors already seeded.");

        if (!await db.Materials.AnyAsync())
        {
            var materials = await AskOllama<List<OllamaName>>(client, """
                Generate a list of 8 common sneaker materials.
                Return ONLY a JSON array. No markdown. Start with [
                Each object: {"name": "Leather"}
                Include: Leather, Suede, Canvas, Mesh, Synthetic, Cotton, Polyester, Rubber
                """);

            if (materials is not null)
            {
                await db.Materials.AddRangeAsync(materials.Select(m => new Material { Name = m.Name }));
                await db.SaveChangesAsync();
                log.Add($"{materials.Count} materials seeded.");
            }
        }
        else log.Add("Materials already seeded.");

        var existingProducts = await db.Products.CountAsync();
        if (existingProducts < 10)
        {
            var result = await GenerateAndInsertProducts(db, client);
            log.Add($"Products seeded.");
            return Results.Ok(new { steps = log, details = result });
        }
        else log.Add($"Products already seeded ({existingProducts} existing).");

        return Results.Ok(new { steps = log });
    }

    private static async Task<object> GenerateAndInsertProducts(AppDbContext db, HttpClient client)
    {
        var brands = await db.Brands.Where(b => b.ParentId == null).ToListAsync();
        var categories = await db.Categories.ToListAsync();
        var sizes = await db.Sizes.Where(s => s.SizeType!.Name == "Footwear").ToListAsync();
        var colors = await db.Colors.ToListAsync();

        var sneakersCategory = categories.FirstOrDefault(c =>
            c.Name.Contains("Sneaker", StringComparison.OrdinalIgnoreCase)) ?? categories.First();

        var brandMap = string.Join(", ", brands.Select(b => $"\"{b.Name}\":\"{b.Id}\""));
        var colorMap = string.Join(", ", colors.Select(c => $"\"{c.Name}\":\"{c.Id}\""));

        var seedSeller = await db.Sellers.FirstOrDefaultAsync(s => s.User.FirebaseUid == "seed-bot");
        if (seedSeller is null)
        {
            var seedRole = await db.Roles.FirstAsync(r => r.Level == RoleLevel.Seller);
            var seedUser = new User { FirebaseUid = "seed-bot", RoleId = seedRole.Id, CreatedBy = "seed-ai" };
            await db.Users.AddAsync(seedUser);
            await db.SaveChangesAsync();

            seedSeller = new Seller { UserId = seedUser.Id, EnrollmentDate = DateTime.UtcNow, CreatedBy = "seed-ai" };
            await db.Sellers.AddAsync(seedSeller);
            await db.SaveChangesAsync();
        }

        var totalInserted = 0;
        var totalSkipped = 0;

        for (int batch = 1; batch <= 20; batch++)
        {
            var batchBrands = brands.Skip((batch - 1) * 4).Take(4).ToList();
            var batchBrandMap = string.Join(", ", batchBrands.Select(b => $"\"{b.Name}\":\"{b.Id}\""));
            var batchBrandNames = string.Join(", ", batchBrands.Select(b => b.Name));

            var prompt = $$"""
            You are a sneaker product database generator.
            Generate exactly 5 sneaker products. Each product must use a DIFFERENT brand.

            Return ONLY a valid JSON array of exactly 5 objects. Start with [ and end with ]
            No markdown, no explanation, no extra text.

            MANDATORY RULES:
            1. brandId MUST be one of: {{batchBrandMap}}
            2. categoryId MUST be EXACTLY this string, copy-paste it: "{{sneakersCategory.Id}}" DO NOT use any other categoryId. This is mandatory.
            3. colorId MUST be one of: {{colorMap}}
            4. Each product MUST use a different brand
            5. releaseDate format: "2024-01-01T00:00:00Z"
            6. productUniversalId format: "AB1234-001" unique per product
            7. stockItems: 3 sizes, prices 10-20% above retailPrice
            8. photos: leave as empty array [], photos will be added automatically

            Example object:
            {"title":"Adidas Originals Superstar","shortDescription":"Iconic shell-toe sneaker.","description":"The Adidas Superstar debuted in 1969...","brandId":"<guid>","categoryId":"{{sneakersCategory.Id}}","colorId":"<guid>","retailPrice":120.0,"releaseDate":"2024-03-15T00:00:00Z","productUniversalId":"AD1234-001","photos":[],"stockItems":[{"sizeLabel":"41","price":135.0},{"sizeLabel":"42","price":135.0},{"sizeLabel":"43","price":138.0}]}

            Brands for this batch: {{batchBrandNames}}
            Colors: {{colorMap}}
        """;

            var raw = await CallOllama(client, prompt, numPredict: 3000);
            if (raw is null) { totalSkipped += 5; continue; }

            var text = CleanJson(raw);
            if (text.StartsWith("{")) text = $"[{text}]";

            List<AiProductSeed>? products;
            try { products = JsonSerializer.Deserialize<List<AiProductSeed>>(text, JsonOpts); }
            catch(Exception e) { totalSkipped += 5; continue; }

            if (products is null) { totalSkipped += 5; continue; }

            foreach (var p in products)
            {
                try
                {
                    if (!Guid.TryParse(p.BrandId, out var brandId)) { totalSkipped++; continue; }
                    if (!Guid.TryParse(p.CategoryId, out var catId)) { totalSkipped++; continue; }
                    Guid.TryParse(p.ColorId, out var colorId);

                    // fetch photo de pe unsplash
                    var photoUrl = await GetUnsplashPhoto(client, p.Title);

                    var product = new Product
                    {
                        Title = p.Title,
                        ShortDescription = p.ShortDescription,
                        Description = p.Description,
                        BrandId = brandId,
                        CategoryId = catId,
                        ColorId = colorId == Guid.Empty ? null : colorId,
                        RetailPrice = p.RetailPrice,
                        ReleaseDate = DateTime.TryParse(p.ReleaseDate, out var rd)
                            ? DateTime.SpecifyKind(rd, DateTimeKind.Utc)
                            : DateTime.UtcNow,
                        ProductUniversalId = p.ProductUniversalId,
                        CreatedBy = "seed-ai"
                    };

                    product.Photos = [new ProductPhoto
                    {
                        PhotoUrl = photoUrl,
                        IsPrimary = true,
                        DisplayOrder = 0,
                        CreatedBy = "seed-ai"
                    }];

                    await db.Products.AddAsync(product);
                    await db.SaveChangesAsync();

                    foreach (var si in p.StockItems ?? [])
                    {
                        var size = sizes.FirstOrDefault(s => s.SizeEu == si.SizeLabel);
                        if (size is null) continue;

                        await db.StockItems.AddAsync(new StockItem
                        {
                            ProductId = product.Id,
                            SellerId = seedSeller.Id,
                            SizeId = size.Id,
                            Price = si.Price,
                            StatusItem = ItemStatus.Active,
                            CreatedBy = "seed-ai"
                        });
                    }

                    await db.SaveChangesAsync();
                    totalInserted++;
                }
                catch(Exception e) { totalSkipped++; }
            }
        }

        return new { inserted = totalInserted, skipped = totalSkipped };
    }

    private static async Task<string> GetUnsplashPhoto(HttpClient client, string query)
    {
        const string accessKey = "fS7Iq4ksQjYt8iOk5P9R0l1RHCUD6x3p-o2yh4kPn2I";
        const string fallback = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800";

        try
        {
            var url = $"https://api.unsplash.com/search/photos?query={Uri.EscapeDataString(query)}&per_page=1&client_id={accessKey}";
            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode) return fallback;

            var json = await response.Content.ReadAsStringAsync();
            var doc = JsonDocument.Parse(json);
            var results = doc.RootElement.GetProperty("results");
            if (results.GetArrayLength() == 0) return fallback;

            return results[0].GetProperty("urls").GetProperty("regular").GetString() ?? fallback;
        }
        catch { return fallback; }
    }
    private static async Task SeedBase(AppDbContext db)
    {
        await db.Roles.AddRangeAsync(
            new Role { Name = "user", Level = RoleLevel.User },
            new Role { Name = "seller", Level = RoleLevel.Seller },
            new Role { Name = "authenticator", Level = RoleLevel.Authenticator },
            new Role { Name = "chatsupport", Level = RoleLevel.ChatSupport },
            new Role { Name = "marketing", Level = RoleLevel.Marketing },
            new Role { Name = "inventory", Level = RoleLevel.Inventory },
            new Role { Name = "finance", Level = RoleLevel.Finance },
            new Role { Name = "admin", Level = RoleLevel.Admin },
            new Role { Name = "owner", Level = RoleLevel.Owner }
        );

        await db.Genders.AddRangeAsync(
            new Gender { Name = "Men" },
            new Gender { Name = "Women" },
            new Gender { Name = "Kids" },
            new Gender { Name = "Unisex" }
        );

        var footwearType = new SizeType { Name = "Footwear" };
        var apparelType = new SizeType { Name = "Apparel" };
        await db.SizeTypes.AddRangeAsync(footwearType, apparelType);
        await db.SaveChangesAsync();

        var euSizes = new[]
        {
            ("36","4","3.5","22.5"),("37","4.5","4","23.5"),("38","5.5","5","24"),
            ("39","6.5","6","24.5"),("40","7","6.5","25"),("41","7.5","7","25.5"),
            ("42","8.5","8","26.5"),("42.5","9","8.5","27"),("43","9.5","9","27.5"),
            ("44","10","9.5","28"),("44.5","10.5","10","28.5"),("45","11","10.5","29"),
            ("46","12","11","29.5"),("47","13","12","30"),("47.5","13.5","12.5","30.5"),
            ("48","14","13","31")
        };

        await db.Sizes.AddRangeAsync(euSizes.Select(s => new Size
        {
            SizeTypeId = footwearType.Id,
            SizeLabel = s.Item1,
            SizeEu = s.Item1,
            SizeUs = s.Item2,
            SizeUk = s.Item3,
            SizeCm = double.Parse(s.Item4, System.Globalization.CultureInfo.InvariantCulture)
        }));

        await db.Sizes.AddRangeAsync(
            new[] { "XS", "S", "M", "L", "XL", "XXL" }.Select(s => new Size
            {
                SizeTypeId = apparelType.Id,
                SizeLabel = s,
                SizeEu = s
            })
        );

        await db.SaveChangesAsync();
    }

    private static async Task<IResult> ResetDb(AppDbContext db)
    {
        db.StockItems.RemoveRange(db.StockItems);
        db.ProductPhotos.RemoveRange(db.ProductPhotos);
        db.Products.RemoveRange(db.Products);
        db.Brands.RemoveRange(db.Brands);
        db.Categories.RemoveRange(db.Categories);
        db.Colors.RemoveRange(db.Colors);
        db.Materials.RemoveRange(db.Materials);
        db.Sizes.RemoveRange(db.Sizes);
        db.SizeTypes.RemoveRange(db.SizeTypes);
        db.Genders.RemoveRange(db.Genders);
        db.Roles.RemoveRange(db.Roles);
        db.Sellers.RemoveRange(db.Sellers);
        db.Users.RemoveRange(db.Users.Where(u => u.CreatedBy == "seed-ai"));
        await db.SaveChangesAsync();
        return Results.Ok("DB reset complete.");
    }

    private static async Task<T?> AskOllama<T>(HttpClient client, string prompt)
    {
        var raw = await CallOllama(client, prompt);
        if (raw is null) return default;

        var text = CleanJson(raw);

        if (typeof(T).IsGenericType && typeof(T).GetGenericTypeDefinition() == typeof(List<>))
        {
            if (text.StartsWith("[") && !text.Contains("\"") && !text.Contains("{"))
            {
                var inner = text[1..^1];
                text = "[" + string.Join(",", inner.Split(',').Select(s => $"{{\"name\":\"{s.Trim()}\"}}")) + "]";
                goto deserialize;
            }

            if (text.StartsWith("{"))
            {
                try
                {
                    var doc = JsonDocument.Parse(text);
                    foreach (var prop in doc.RootElement.EnumerateObject())
                        if (prop.Value.ValueKind == JsonValueKind.Array)
                        { text = prop.Value.GetRawText(); break; }
                }
                catch { text = $"[{text}]"; }
            }

            try
            {
                var doc = JsonDocument.Parse(text);
                if (doc.RootElement.ValueKind == JsonValueKind.Array &&
                    doc.RootElement.GetArrayLength() > 0 &&
                    doc.RootElement[0].ValueKind == JsonValueKind.String)
                {
                    var unwrapped = doc.RootElement.EnumerateArray()
                        .Select(el => el.GetString() ?? "{}");
                    text = $"[{string.Join(",", unwrapped)}]";
                }
            }
            catch { }
        }

    deserialize:
        try { return JsonSerializer.Deserialize<T>(text, JsonOpts); }
        catch (Exception e)
        {
            Console.WriteLine($"PARSE ERROR: {e.Message}");
            Console.WriteLine($"RAW: {text[..Math.Min(300, text.Length)]}");
            return default;
        }
    }

    private static async Task<string?> CallOllama(HttpClient client, string prompt, int numPredict = 4000)
    {
        try
        {
            var body = JsonSerializer.Serialize(new
            {
                model = OllamaModel,
                prompt = prompt,
                stream = false,
                options = new { temperature = 0.7, num_predict = numPredict }
            });

            var response = await client.PostAsync(OllamaUrl,
                new StringContent(body, Encoding.UTF8, "application/json"));

            if (!response.IsSuccessStatusCode) return null;

            var json = await response.Content.ReadAsStringAsync();
            var parsed = JsonDocument.Parse(json);
            return parsed.RootElement.GetProperty("response").GetString();
        }
        catch (Exception e)
        { return null; }
    }

    private static string CleanJson(string text)
    {
        text = text.Trim();
        var start = text.IndexOfAny(['[', '{']);
        var end = text.LastIndexOfAny([']', '}']);
        if (start >= 0 && end > start)
            text = text[start..(end + 1)];
        return text;
    }
}

file record OllamaBrand
{
    [System.Text.Json.Serialization.JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;
}

file record OllamaName(string Name);
file record AiProductSeed(
    string Title,
    string ShortDescription,
    string Description,
    string BrandId,
    string CategoryId,
    string ColorId,
    double RetailPrice,
    string ReleaseDate,
    string ProductUniversalId,
    List<string>? Photos,
    List<AiStockItem>? StockItems
);
file record AiStockItem(string SizeLabel, double Price);

