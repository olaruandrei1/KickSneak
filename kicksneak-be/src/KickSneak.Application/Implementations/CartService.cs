using KickSneak.Application.Contracts.Application;
using KickSneak.Application.Contracts.Persistence;
using KickSneak.Domain.DTOs.Cart;
using KickSneak.Domain.Entities.Commerce;
using KickSneak.Domain.Enums;

namespace KickSneak.Application.Implementations;

public sealed class CartService(IUnitOfWork uow) : ICartService
{
    public async Task<CartResponseDto> GetCartAsync(string firebaseUid, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
        
        if (user is null) 
            return new CartResponseDto([]);

        var cartItems = await uow.Cart.GetAsync(c => c.UserId == user.Id, ct,
            c => c.StockItem,
            c => c.StockItem.Product,
            c => c.StockItem.Product.Photos,
            c => c.StockItem.Product.Brand,
            c => c.StockItem.Product.Category,
            c => c.StockItem.Size,
            c => c.UsedItem,
            c => c.UsedItem.Product,
            c => c.UsedItem.Photos,
            c => c.UsedItem.Product.Brand,
            c => c.UsedItem.Product.Category,
            c => c.UsedItem.Size
        );

        var dtos = cartItems.Select(c =>
        {
            if (c.StockItem?.Product is { } p)
                return new CartItemDto(
                    Id: c.Id,
                    Name: p.Title ?? string.Empty,
                    Brand: p.Brand?.Name ?? string.Empty,
                    Price: c.StockItem.Price,
                    Image: p.Photos.FirstOrDefault(x => x.IsPrimary)?.PhotoUrl ?? string.Empty,
                    Category: p.Category?.Name ?? string.Empty,
                    Size: c.StockItem.Size?.SizeLabel ?? string.Empty,
                    Quantity: 1
                );

            if (c.UsedItem?.Product is { } up)
                return new CartItemDto(
                    Id: c.Id,
                    Name: up.Title ?? string.Empty,
                    Brand: up.Brand?.Name ?? string.Empty,
                    Price: c.UsedItem.Price,
                    Image: c.UsedItem.Photos.FirstOrDefault(x => x.IsPrimary)?.PhotoUrl ?? string.Empty,
                    Category: up.Category?.Name ?? string.Empty,
                    Size: c.UsedItem.Size?.SizeLabel ?? string.Empty,
                    Quantity: 1
                );

            return null;
        })
        .Where(x => x is not null)
        .Cast<CartItemDto>()
        .ToList();

        return new CartResponseDto(dtos);
    }

    public async Task<CartResponseDto> AddToCartAsync(string firebaseUid, AddToCartDto dto, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
        if (user is null) return new CartResponseDto([]);

        Guid? stockItemId = dto.StockItemId;
        if (stockItemId is null && dto.ProductId.HasValue)
        {
            var allStock = await uow.StockItems.GetAsync(
                s => s.ProductId == dto.ProductId.Value, ct,
                s => s.Size);

            var sizeLabel = dto.SizeLabel?.Trim();

            var activeStock = allStock
                .Where(s => !s.IsDeleted && s.StatusItem == ItemStatus.Active)
                .ToList();

            // Match the exact size label the client sent (same format as sizes.SizeLabel);
            // if no exact match (or no size given), fall back to the first active listing.
            var stockItem = (!string.IsNullOrEmpty(sizeLabel)
                    ? activeStock.FirstOrDefault(s => s.Size?.SizeLabel == sizeLabel)
                    : null)
                ?? activeStock.FirstOrDefault();

            stockItemId = stockItem?.Id;
        }

        if (stockItemId is null && dto.UsedItemId is null)
            return new CartResponseDto([]);

        var existing = await uow.Cart.GetFirstOrDefaultAsync(
            c => c.UserId == user.Id && (stockItemId != null ? c.StockItemId == stockItemId : c.UsedItemId == dto.UsedItemId),
            ct
        );

        if (existing is not null)
            return await GetCartAsync(firebaseUid, ct);

        await uow.Cart.AddAsync(new UserCart
        {
            UserId = user.Id,
            StockItemId = stockItemId,
            UsedItemId = dto.UsedItemId
        }, ct);

        await uow.SaveChangesAsync(ct);

        return await GetCartAsync(firebaseUid, ct);
    }

    public async Task<CartResponseDto> RemoveFromCartAsync(string firebaseUid, Guid cartItemId, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
        if (user is null) return new CartResponseDto([]);

        var item = await uow.Cart.GetFirstOrDefaultAsync(c => c.Id == cartItemId && c.UserId == user.Id, ct);

        if (item is not null)
        {
            uow.Cart.Delete(item);

            await uow.SaveChangesAsync(ct);
        }

        return await GetCartAsync(firebaseUid, ct);
    }
}
