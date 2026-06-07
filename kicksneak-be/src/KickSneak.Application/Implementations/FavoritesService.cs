using KickSneak.Application.Contracts.Application;
using KickSneak.Application.Contracts.Persistence;
using KickSneak.Domain.DTOs.Favorites;
using KickSneak.Domain.Entities.Commerce;

namespace KickSneak.Application.Implementations;

public sealed class FavoritesService(IUnitOfWork uow) : IFavoritesService
{
    public async Task<FavoritesResponseDto> GetFavoritesAsync(string firebaseUid, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
        if (user is null) return new FavoritesResponseDto([]);

        var favorites = await uow.Favorites.GetAsync(
            f => f.UserId == user.Id && !f.IsDeleted, ct,
            f => f.Product,
            f => f.Product.Photos,
            f => f.Product.Brand,
            f => f.Product.Category,
            f => f.Product.StockItems
        );

        var dtos = favorites.Select(f =>
        {
            var p = f.Product;
            return p is null ? null : new FavoriteItemDto(
                Id: p.Id,
                Name: p.Title ?? string.Empty,
                Brand: p.Brand?.Name ?? string.Empty,
                Price: p.StockItems.Where(s => !s.IsDeleted).Select(s => s.Price).DefaultIfEmpty(0).Min(),
                Image: p.Photos.FirstOrDefault(x => x.IsPrimary)?.PhotoUrl ?? string.Empty,
                Category: p.Category?.Name ?? string.Empty,
                IsFavorite: true
            );
        })
        .Where(x => x is not null)
        .Cast<FavoriteItemDto>()
        .ToList();

        return new FavoritesResponseDto(dtos);
    }

    public async Task<FavoritesResponseDto> ToggleFavoriteAsync(string firebaseUid, ToggleFavoriteDto dto, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
        if (user is null) return new FavoritesResponseDto([]);

        var existing = await uow.Favorites.GetFirstOrDefaultAsync(
            f => f.UserId == user.Id && f.ProductId == dto.ProductId, ct);

        if (existing is not null)
        {
            existing.IsDeleted = !existing.IsDeleted;

            uow.Favorites.Update(existing);

            await uow.SaveChangesAsync(ct);

            return await GetFavoritesAsync(firebaseUid, ct);
        }
        else
        {
            await uow.Favorites.AddAsync(new UserFavorite
            {
                UserId = user.Id,
                ProductId = dto.ProductId
            }, ct);
        }

        await uow.SaveChangesAsync(ct);
        return await GetFavoritesAsync(firebaseUid, ct);
    }
}
