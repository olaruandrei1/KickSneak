using KickSneak.Application.Contracts.Application;
using KickSneak.Application.Contracts.Persistence;
using KickSneak.Domain.DTOs.Brands;

namespace KickSneak.Application.Implementations;

public sealed class BrandService(IUnitOfWork uow) : IBrandService
{
    private static readonly HashSet<string> LuxuryBrands = ["Balenciaga", "Gucci", "OFF-WHITE", "Dior", "Louis Vuitton", "Prada"];
    private static readonly HashSet<string> ApparelBrands = ["Supreme", "BAPE", "FOG Essentials", "Travis Scott", "Palace", "Stüssy"];

    public async Task<BrandsResponseDto> GetBrandsAsync(CancellationToken ct = default)
    {
        var brands = await uow.Brands.GetAllAsync(ct);

        var dtos = brands.Select(b =>
        {
            var productCount = b.Products?.Count ?? 0;
            var category = ResolveCategoryLabel(b.Name ?? string.Empty);

            return new BrandDto(
                Id: b.Id,
                Name: b.Name ?? string.Empty,
                Slug: (b.Name ?? string.Empty).Replace(" ", "+"),
                Logo: $"https://picsum.photos/seed/{b.Name?.ToLower()}/200/80",
                ProductCount: productCount,
                Category: category
            );
        }).ToList();

        return new BrandsResponseDto(
            Featured: dtos.Where(b => b.Category == "Sneakers").ToList(),
            Luxury: dtos.Where(b => b.Category == "Luxury").ToList(),
            Apparel: dtos.Where(b => b.Category == "Apparel").ToList()
        );
    }

    private static string ResolveCategoryLabel(string name) =>
        LuxuryBrands.Contains(name) ? "Luxury" :
        ApparelBrands.Contains(name) ? "Apparel" :
                                       "Sneakers";
}
