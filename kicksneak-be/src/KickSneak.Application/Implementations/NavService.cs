using KickSneak.Application.Contracts.Application;
using KickSneak.Domain.DTOs.Nav;
using KickSneak.Infrastructure.AzureTableEntities;
using KickSneak.Infrastructure.Contracts;
using System.Text.Json;

namespace KickSneak.Application.Implementations;

public sealed class NavService(Lazy<IAzureTableService> tableService, Lazy<ICacheService> cache) : INavService
{
    private const string NavCacheKey = "nav:categories";
    private const string FooterCacheKey = "nav:footer";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(6);

    public async Task<List<NavbarCategoryDto>> GetNavbarCategoriesAsync(CancellationToken ct = default)
    {
        var cached = await cache.Value.GetAsync<List<NavbarCategoryDto>>(NavCacheKey, ct);
        if (cached is not null) return cached;

        var entities = new List<NavbarCategoryEntity>();
        await foreach (var entity in tableService.Value.QueryAsync<NavbarCategoryEntity>("navbar_categories", "PartitionKey eq 'navbar'", ct))
        {
            entities.Add(entity);
        }

        List<NavbarCategoryDto> dtos;

        if (entities.Count == 0)
        {
            dtos = GetHardcodedNavbar();
        }
        else
        {
            dtos = entities
                .OrderBy(e => e.Order)
                .Select(e => new NavbarCategoryDto(
                    Id: e.RowKey,
                    Label: e.Label,
                    Highlight: e.Highlight,
                    Columns: JsonSerializer.Deserialize<List<NavColumnDto>>(e.ColumnsJson) ?? []
                )).ToList();
        }

        await cache.Value.SetAsync(NavCacheKey, dtos, CacheTtl, ct);

        return dtos;
    }

    public async Task<FooterDto?> GetFooterAsync(CancellationToken ct = default)
    {
        var cached = await cache.Value.GetAsync<FooterDto>(FooterCacheKey, ct);
        if (cached is not null) return cached;

        var entity = await tableService.Value.GetAsync<FooterEntity>("footer_data", "footer", "main", ct);

        FooterDto dto;

        if (entity is null)
        {
            dto = GetHardcodedFooter();
        }
        else
        {
            dto = new FooterDto(
                Columns: JsonSerializer.Deserialize<List<FooterColumnDto>>(entity.ColumnsJson) ?? [],
                Social: JsonSerializer.Deserialize<List<FooterSocialDto>>(entity.SocialJson) ?? [],
                Legal: JsonSerializer.Deserialize<List<FooterLinkDto>>(entity.LegalJson) ?? [],
                Copyright: entity.Copyright
            );
        }

        await cache.Value.SetAsync(FooterCacheKey, dto, CacheTtl, ct);
        return dto;
    }


    private static List<NavbarCategoryDto> GetHardcodedNavbar() =>
    [
        new("brands",    "Brands",    false, [
            new("Popular Brands",  [new("adidas", "/search?brand=adidas"), new("Air Jordan", "/search?brand=Air+Jordan"), new("Nike", "/search?brand=Nike"), new("New Balance", "/search?brand=New+Balance"), new("Yeezy", "/search?brand=Yeezy")]),
            new("Luxury Brands",   [new("Balenciaga", "/search?brand=Balenciaga"), new("Gucci", "/search?brand=Gucci"), new("Dior", "/search?brand=Dior"), new("OFF-WHITE", "/search?brand=OFF-WHITE")])
        ]),
            new("trending",  "Trending",  false, [
            new("Hot Right Now",   [new("adidas Samba", "/search?q=adidas+samba"), new("Jordan 1 Low", "/search?q=jordan+1+low"), new("Nike SB Dunk", "/search?q=sb+dunk")]),
            new("Upcoming",        [new("Jordan 4 Military Blue", "/search?q=jordan+4+military+blue")])
        ]),
            new("new",       "New",       false, [
            new("Just Dropped",    [new("ASICS Gel Kayano 14", "/search?q=gel+kayano+14"), new("Jordan 5 Aqua", "/search?q=jordan+5+aqua")])
        ]),
            new("deals",     "Deals",     true,  [
            new("Steals & Deals",  [new("Under $100", "/search?priceMax=100"), new("Under $150", "/search?priceMax=150"), new("Below Retail", "/search?sort=price_asc")])
        ]),
            new("sneakers",  "Sneakers",  false, [
            new("Popular Brands",  [new("adidas", "/search?category=Sneakers&brand=adidas"), new("Nike", "/search?category=Sneakers&brand=Nike"), new("Air Jordan", "/search?category=Sneakers&brand=Air+Jordan")])
        ]),
            new("apparel",   "Apparel",   false, [
            new("Top Brands",      [new("Supreme", "/search?category=Apparel&brand=Supreme"), new("BAPE", "/search?category=Apparel&brand=BAPE")])
        ]),
            new("accessories","Accessories",false, [
            new("Categories",      [new("Bags", "/search?category=Accessories&q=bags"), new("Watches", "/search?category=Accessories&q=watches")])
        ])
    ];

    private static FooterDto GetHardcodedFooter() => new(
        Columns: [
            new("Air Jordan",    [new("Air Jordan 1", "/search?q=air+jordan+1"), new("Air Jordan 4", "/search?q=air+jordan+4"), new("Air Jordan 11", "/search?q=air+jordan+11")]),
            new("Nike",          [new("Air Force 1", "/search?q=air+force+1"), new("Nike Dunk", "/search?q=nike+dunk"), new("Air Max", "/search?q=air+max")]),
            new("About",         [new("How It Works", "/about"), new("Careers", "/about"), new("Newsroom", "/about")]),
            new("Help",          [new("Help Center", "/about"), new("Contact Us", "/profile?section=chat"), new("Returns", "/profile?section=returns")]),
            new("Sell",          [new("Selling Guide", "/profile?section=seller-listings"), new("Professional Tools", "/profile?section=seller-listings")])
            ],
            Social: [
                new("Twitter",   "https://x.com"),
            new("Instagram", "https://instagram.com"),
            new("YouTube",   "https://youtube.com")
            ],
            Legal: [
                new("Terms",         "/terms"),
            new("Privacy",       "/terms"),
            new("Cookie Policy", "/terms")
            ],
        Copyright: $"© {DateTime.UtcNow.Year} KickSneak. All rights reserved."
    );
}
