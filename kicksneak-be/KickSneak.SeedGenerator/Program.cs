using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;


var API_KEY = Environment.GetEnvironmentVariable("GEMINI_API_KEY")
    ?? throw new Exception("Set GEMINI_API_KEY environment variable first!\nPowerShell: $env:GEMINI_API_KEY = \"your-key-here\"");
const string MODEL = "gemini-2.5-flash";
string BASE_URL = $"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}";
const string OUTPUT_DIR = "seed_output";
const int DELAY_MS = 8000; 
const int MAX_RETRIES = 3;

Directory.CreateDirectory(OUTPUT_DIR);

var http = new HttpClient { Timeout = TimeSpan.FromMinutes(3) };
var jsonOpts = new JsonSerializerOptions { WriteIndented = true, DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull };


var state = new GeneratorState();
var stateFile = Path.Combine(OUTPUT_DIR, "_state.json");

if (File.Exists(stateFile))
{
    state = JsonSerializer.Deserialize<GeneratorState>(File.ReadAllText(stateFile)) ?? new();
    Log($"Resuming from step {state.CompletedSteps + 1}");
}


var schemaContext = """
    You are generating seed data for KickSneak, a sneaker/apparel/collectibles marketplace (like StockX/GOAT).

    CRITICAL RULES:
    - Output ONLY valid JSON. No markdown, no code fences, no explanation.
    - GUIDs must be realistic UUID v4: "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx" where y is 8/9/a/b. Each must look random.
    - All entities with audit fields use: IsDeleted=false, CreatedAt=random timestamp 2025-12-01 to 2026-06-01 format "2026-01-15T14:30:00", CreatedBy="seed", ModifiedAt=same or slightly later, ModifiedBy="seed".
    - Column names are PascalCase exactly as specified.
    - Use REAL product names, real SKUs, real prices. Search your knowledge for actual sneaker data.

    DATABASE SCHEMA (relevant tables):

    roles: Id(uuid), Name(varchar), Level(int), IsDeleted, CreatedAt, CreatedBy, ModifiedAt, ModifiedBy
    brands: Id(uuid), Name(varchar), ParentId(uuid nullable), IsDeleted, CreatedAt, CreatedBy, ModifiedAt, ModifiedBy
    categories: Id(uuid), Name(varchar), ParentId(uuid nullable), IsDeleted, CreatedAt, CreatedBy, ModifiedAt, ModifiedBy
    colors: Id(uuid), Name(varchar), IsDeleted, CreatedAt, CreatedBy, ModifiedAt, ModifiedBy
    materials: Id(uuid), Name(varchar), IsDeleted, CreatedAt, CreatedBy, ModifiedAt, ModifiedBy
    genders: Id(uuid), Name(varchar), IsDeleted, CreatedAt, CreatedBy, ModifiedAt, ModifiedBy
    fits: Id(uuid), Name(varchar), IsDeleted, CreatedAt, CreatedBy, ModifiedAt, ModifiedBy
    size_types: Id(uuid), Name(varchar), IsDeleted, CreatedAt, CreatedBy, ModifiedAt, ModifiedBy
    sizes: Id(uuid), SizeTypeId(uuid), SizeLabel(varchar), SizeUs(varchar), SizeEu(varchar), SizeUk(varchar), SizeCm(double), IsDeleted, CreatedAt, CreatedBy, ModifiedAt, ModifiedBy
    users: Id(uuid), FirebaseUid(varchar NOT NULL), FirstName(varchar), LastName(varchar), GenderId(uuid), BirthDate(timestamp), RoleId(uuid), ProfilePhoto(varchar), IsSuspended(bool), IsBlocked(bool), IsDeleted, CreatedAt, CreatedBy, ModifiedAt, ModifiedBy
    sellers: Id(uuid), UserId(uuid), EnrollmentDate(timestamp), IsBlocked(bool), IsSuspended(bool), Reason(text), AffiliateId(uuid nullable), TrustScore(double), IsDeleted, CreatedAt, CreatedBy, ModifiedAt, ModifiedBy, City(varchar), CompanyName(varchar), HasCompany(bool), Phone(varchar), ProductType(varchar), SellType(varchar), StoreName(varchar), VatNumber(varchar)
    products: Id(uuid), BrandId(uuid), CategoryId(uuid), GenderId(uuid), FitId(uuid), Title(varchar), ShortDescription(varchar), Description(text), MaterialId(uuid), ColorId(uuid), RetailPrice(double), ReleaseDate(timestamp), ProductUniversalId(varchar), IsDeleted, CreatedAt, CreatedBy, ModifiedAt, ModifiedBy
    product_photos: Id(uuid), ProductId(uuid), PhotoUrl(varchar), IsPrimary(bool), DisplayOrder(int), IsDeleted, CreatedAt, CreatedBy, ModifiedAt, ModifiedBy
    stock_items: Id(uuid), ProductId(uuid), SellerId(uuid), SizeId(uuid), Price(double), StatusItem(int 0=PendingReview 1=Active 2=Sold 3=Refused), RefuseReason(varchar nullable), IsDeleted, CreatedAt, CreatedBy, ModifiedAt, ModifiedBy
""";


var batches = new List<BatchDef>
{
    new("01_roles", "Generate roles as JSON array. 3 roles: User (Level:1), Seller (Level:2), Admin (Level:3)."),

    new("02_brands", """
        Generate brands as JSON array. 30+ real sneaker/streetwear brands. Use ParentId for sub-brands:
        - Athletic: Nike, Adidas, New Balance, Puma, Reebok, ASICS, Saucony, Hoka, On Running, Under Armour, Converse, Vans, Salomon
        - Luxury: Balenciaga, Gucci, Louis Vuitton, Dior, Prada, Versace, Alexander McQueen, Rick Owens
        - Streetwear: Supreme, A Bathing Ape (BAPE), Stussy, Fear of God, Off-White, Travis Scott, Comme des Garcons
        - Sub-brands with ParentId: Air Jordan → parent Nike, Yeezy → parent Adidas, FOG Essentials → parent Fear of God
        Root brands have ParentId: null.
        """
    ),

    new("03_categories", """
        Generate categories as JSON array. 20 categories with hierarchy via ParentId.
        Root (ParentId: null): Sneakers, Shoes, Apparel, Accessories, Collectibles
        Sub (ParentId = parent's Id):
        Sneakers → Running, Basketball, Lifestyle, Skateboarding, Trail
        Shoes → Slides & Sandals, Boots, Loafers
        Apparel → T-Shirts, Hoodies, Jackets, Pants, Shorts
        Accessories → Hats, Bags, Socks, Sunglasses, Watches, Wallets
        Collectibles → Trading Cards, Figurines
        """
    ),

    new("04_colors", "Generate colors as JSON array. 20 colors: Black, White, Red, Blue, Green, Grey, Navy, Beige, Pink, Orange, Brown, Purple, Yellow, Sail, Olive, Cream, Bone, Multi-Color, Bred (Black/Red), University Blue"),

    new("05_materials", "Generate materials as JSON array. 12 materials: Leather, Suede, Canvas, Mesh, Knit, Nylon, Rubber, Gore-Tex, Primeknit, Flyknit, Patent Leather, Synthetic"),

    new("06_fits", "Generate fits as JSON array. 4 fits: True to Size, Runs Small, Runs Large, Wide Fit"),

    new("07_genders", "Generate genders as JSON array. 6 values: Men, Women, Unisex, Non-Binary, Genderfluid, Kids"),

    new("08_size_types", "Generate size_types as JSON array. 3 types: US, EU, UK"),

    new("09_sizes", """
        Generate sizes as JSON array. ~30 sizes covering US 3.5 through 15 (half sizes).
        Each size row has: SizeTypeId referencing one of the 3 size_types you'd generate, SizeLabel (e.g. "US 9 / EU 42.5 / UK 8"), SizeUs, SizeEu, SizeUk, SizeCm (actual foot length).
        Use the US size_type Id for all rows — SizeEu and SizeUk are stored as cross-reference strings.
        """
    ),

    new("10_users", """
        Generate users as JSON array. 30 users:
        - Realistic international names (mix European, American, Asian)
        - FirebaseUid: format "fid_" + 16 random alphanumeric chars, e.g. "fid_a8Kp2mNx7QrT4vLw"
        - GenderId: reference genders from batch 07
        - RoleId: 20 users with User role, 8 with Seller role, 2 with Admin role (use role IDs from batch 01)
        - BirthDate: ages 18-45, format "1995-03-22T00:00:00"
        - ProfilePhoto: "https://picsum.photos/seed/{firstname}/200" for ~60%, null for rest
        - IsSuspended: false, IsBlocked: false
        """
    ),

    new("11_sellers", """
        Generate sellers as JSON array. 8 sellers — one for each user with Seller role from batch 10.
        - UserId: reference the 8 seller-role users
        - StoreName: creative names like "SoleVault", "KickStation", "HypeCloset", "SneakerDen", "UrbanSoles", "FlipCity", "RarePairs", "DropsOnly"
        - Phone: "+40 7XX XXX XXX" format with realistic Romanian numbers
        - City: Bucharest, Cluj-Napoca, Timișoara, Iași, Brașov, Constanța, Sibiu, Oradea
        - SellType: "new" or "both"
        - ProductType: "sneakers", "apparel", or "all"
        - HasCompany: true for ~40%, with CompanyName and VatNumber "RO" + 8 digits
        - TrustScore: 3.5 to 5.0
        - AffiliateId: null, IsBlocked: false, IsSuspended: false, Reason: null
        """
    ),
};

for (int i = 1; i <= 400; i++)
{
    var from = (i - 1) * 25 + 1;
    var to = i * 25;
    batches.Add(new("products_" + i.ToString("D4"),
        "Generate 25 REAL sneaker/apparel/accessory products with their photos. Output JSON object with two keys: \"products\" and \"product_photos\".\n\n" +
        "This is product batch " + i + "/400. Products #" + from + " through #" + to + " overall.\n\n" +
        """
            UNIQUENESS RULES — CRITICAL:
            - NEVER repeat a product from a previous batch. Each product must be a UNIQUE model + colorway combination.
            - Use this formula: batch 1-60=Nike models, 61-110=Adidas models, 111-155=Jordan models, 156-195=New Balance models, 196-220=ASICS, 221-240=Puma, 241-260=Converse/Vans, 261-290=luxury brands, 291-340=streetwear/apparel, 341-380=accessories/collectibles, 381-400=mixed rare/collab.
            - Within each brand range, vary: retros, new releases, GR, limited, different colorways, different years.
            - Example: "Nike Air Max 90 White/Black" and "Nike Air Max 90 Infrared" are TWO different products (different colorway).

            PRODUCT QUALITY:
            - Use REAL product names (search your knowledge): real models with real colorway names
            - Real SKU codes (ProductUniversalId): Nike="CW2288-111", Adidas="GY9353", NB="BB550WT1", Jordan="DH6927-140", etc.
            - Real retail prices for each model
            - Real release dates (within last 3 years) or null
            - Reference BrandId, CategoryId, GenderId, FitId, MaterialId, ColorId from earlier batches
            - Vary: high-end collabs, GR releases, retros, lifestyle, running, basketball, apparel, accessories

            PHOTOS:
            - 2-3 per product, PhotoUrl="https://picsum.photos/seed/product-slug-here/800/600" (replace product-slug-here with a slugified unique product title)
            - Exactly 1 IsPrimary=true per product
        """)
    );
}

for (int i = 1; i <= 334; i++)
{
    batches.Add(new("stock_" + i.ToString("D4"),
        "Generate 60 stock_items as JSON array. This is stock batch " + i + "/334.\n\n" +
        """
            IMPORTANT:
            - Each stock_item references a valid ProductId (from products generated earlier), SellerId (from sellers batch 11), SizeId (from sizes batch 09)
            - Fluctuate per product: some products get 10+ stock items, others get 2-3. Rarely (1 in 100), a product has zero stock.
            - Price: within ±30% of product's RetailPrice. Some below retail (deals), some above (hyped/limited).
            - StatusItem distribution: 70% Active(1), 20% Sold(2), 8% PendingReview(0), 2% Refused(3)
            - Refused items get RefuseReason: "Authentication failed", "Condition mismatch", "Wrong size listed", or "Item not as described"
            - Distribute across all 8 sellers
            - Common sizes (US 9-11) should have more stock than extremes (US 4, US 14)
            """)
    );
}

Log($"Total batches: {batches.Count}");
Log($"Starting from step {state.CompletedSteps + 1}");
Log($"Estimated time: ~{(batches.Count - state.CompletedSteps) * DELAY_MS / 60000} minutes");
Log("");

for (int i = state.CompletedSteps; i < batches.Count; i++)
{
    var batch = batches[i];
    var outputFile = Path.Combine(OUTPUT_DIR, $"{batch.Name}.json");

    if (File.Exists(outputFile))
    {
        Log($"[{i + 1}/{batches.Count}] {batch.Name} — already exists, skipping");
        continue;
    }

    Log($"[{i + 1}/{batches.Count}] Generating {batch.Name}...");

    var contextParts = new StringBuilder();
    contextParts.AppendLine(schemaContext);

    if (batch.Name.StartsWith("products_") || batch.Name.StartsWith("stock_"))
    {
        foreach (var lookupFile in new[] { "01_roles", "02_brands", "03_categories", "04_colors", "05_materials", "06_fits", "07_genders", "08_size_types", "09_sizes", "10_users", "11_sellers" })
        {
            var path = Path.Combine(OUTPUT_DIR, $"{lookupFile}.json");

            if (File.Exists(path))
            {
                var content = File.ReadAllText(path);
               
                if (content.Length > 5000)
                    content = content[..5000] + "\n... (truncated, use the IDs shown above)";
               
                contextParts.AppendLine($"\n--- Previously generated {lookupFile} (use these IDs) ---\n{content}");
            }
        }

        if (batch.Name.StartsWith("stock_"))
        {
            var productFiles = Directory.GetFiles(OUTPUT_DIR, "products_*.json")
                .OrderBy(f => f)
                .ToList();

            if (productFiles.Count > 0)
            {
                var sampleProducts = new List<string>();
                foreach (var pf in productFiles)
                {
                    try
                    {
                        var doc = JsonDocument.Parse(File.ReadAllText(pf));
                        if (doc.RootElement.TryGetProperty("products", out var prods))
                        {
                            foreach (var p in prods.EnumerateArray())
                            {
                                if (p.TryGetProperty("Id", out var id) && p.TryGetProperty("RetailPrice", out var price))
                                    sampleProducts.Add($"{id.GetString()}|{price.GetDouble()}");
                            }
                        }
                    }
                    catch { }
                }

                var rng = new Random();
                var subset = sampleProducts.OrderBy(_ => rng.Next()).Take(200).ToList();
                
                contextParts.AppendLine($"\n--- Available Product IDs (Id|RetailPrice) — pick from these ---");
                contextParts.AppendLine(string.Join("\n", subset));
            }
        }
    }

    var fullPrompt = contextParts + "\n\nNOW GENERATE:\n" + batch.Prompt;

    string? json = null;
    for (int retry = 0; retry < MAX_RETRIES; retry++)
    {
        try
        {
            json = await CallGemini(http, fullPrompt);
            if (json != null) break;
        }
        catch (Exception ex)
        {
            Log($"  Attempt {retry + 1}/{MAX_RETRIES} failed: {ex.Message}");
            if (retry < MAX_RETRIES - 1)
                await Task.Delay(DELAY_MS * 2);
        }
    }

    if (json == null)
    {
        Log($"  FAILED after {MAX_RETRIES} retries — stopping. Re-run to resume.");
        break;
    }

    File.WriteAllText(outputFile, json);
    state.CompletedSteps = i + 1;
    File.WriteAllText(stateFile, JsonSerializer.Serialize(state, jsonOpts));

    Log($"  Saved → {outputFile} ({json.Length:N0} chars)");

    if (i < batches.Count - 1)
        await Task.Delay(DELAY_MS);
}

Log("");
Log($"Done! Generated {state.CompletedSteps}/{batches.Count} batches.");
Log($"Output folder: {Path.GetFullPath(OUTPUT_DIR)}");


async Task<string?> CallGemini(HttpClient client, string prompt)
{
    var payload = new
    {
        contents = new[]
        {
            new
            {
                parts = new[]
                {
                    new { text = prompt }
                }
            }
        },
        generationConfig = new
        {
            temperature = 0.7,
            maxOutputTokens = 65536,
            responseMimeType = "application/json"
        }
    };

    var response = await client.PostAsJsonAsync(BASE_URL, payload);

    if (!response.IsSuccessStatusCode)
    {
        var error = await response.Content.ReadAsStringAsync();

        if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
        {
            Log("  Rate limited — waiting 60s...");
            await Task.Delay(60_000);
            return null;
        }

        throw new Exception($"HTTP {(int)response.StatusCode}: {error[..Math.Min(error.Length, 300)]}");
    }

    var doc = await response.Content.ReadFromJsonAsync<JsonDocument>();

    var text = doc?.RootElement
        .GetProperty("candidates")[0]
        .GetProperty("content")
        .GetProperty("parts")[0]
        .GetProperty("text")
        .GetString();

    if (string.IsNullOrWhiteSpace(text))
        throw new Exception("Empty response from Gemini");

    text = text.Trim();

    if (text.StartsWith("```json")) text = text[7..];
    if (text.StartsWith("```")) text = text[3..];
    if (text.EndsWith("```")) text = text[..^3];

    text = text.Trim();

    try
    {
        JsonDocument.Parse(text);
    }
    catch
    {
        throw new Exception($"Invalid JSON returned: {text[..Math.Min(text.Length, 200)]}...");
    }

    return text;
}

void Log(string msg) => Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] {msg}");


class GeneratorState
{
    public int CompletedSteps { get; set; }
}

record BatchDef(string Name, string Prompt);