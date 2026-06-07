using KickSneak.Application.Contracts.Application;
using KickSneak.Application.Contracts.Persistence;
using KickSneak.Domain.DTOs.Orders;

namespace KickSneak.Application.Implementations;

public sealed class OrderService(IUnitOfWork uow) : IOrderService
{
    public async Task<OrdersResponseDto> GetOrdersAsync(string firebaseUid, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
        if (user is null) return new OrdersResponseDto([]);

        var orders = await uow.Orders.GetAsync(o => o.BuyerId == user.Id, ct,
             o => o.StockItem,
             o => o.StockItem.Product,
             o => o.StockItem.Product.Photos,
             o => o.StockItem.Product.Brand,
             o => o.StockItem.Size,
             o => o.UsedItem,
             o => o.UsedItem.Product,
             o => o.UsedItem.Photos,
             o => o.UsedItem.Product.Brand,
             o => o.UsedItem.Size,
             o => o.BuyerAddress
        );

        var dtos = orders.Select(o =>
        {
            var items = new List<OrderItemDto>();

            if (o.StockItem?.Product is { } sp)
                items.Add(new OrderItemDto(
                    Name: sp.Title ?? string.Empty,
                    Brand: sp.Brand?.Name ?? string.Empty,
                    Size: o.StockItem.Size?.SizeLabel ?? string.Empty,
                    Price: o.StockItem.Price,
                    Image: sp.Photos.FirstOrDefault(x => x.IsPrimary)?.PhotoUrl ?? string.Empty
                ));

            if (o.UsedItem?.Product is { } up)
                items.Add(new OrderItemDto(
                    Name: up.Title ?? string.Empty,
                    Brand: up.Brand?.Name ?? string.Empty,
                    Size: o.UsedItem.Size?.SizeLabel ?? string.Empty,
                    Price: o.UsedItem.Price,
                    Image: o.UsedItem.Photos.FirstOrDefault(x => x.IsPrimary)?.PhotoUrl ?? string.Empty
                ));

            var address = o.BuyerAddress is { } a
                ? $"{a.Street} {a.StreetNumber}, {a.City}"
                : null;

            return new OrderDto(
                Id: o.Id,
                Date: o.CreatedAt.ToString("yyyy-MM-dd"),
                Status: o.Status.ToString().ToLowerInvariant(),
                Total: o.TotalPrice,
                Items: items,
                Tracking: o.TrackingNumber,
                Address: address
            );
        }).ToList();

        return new OrdersResponseDto(dtos);
    }

    public async Task<OrderDto?> GetOrderByIdAsync(string firebaseUid, Guid orderId, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
        if (user is null) return null;

        var order = await uow.Orders.GetFirstOrDefaultAsync(
            o => o.Id == orderId && o.BuyerId == user.Id, ct);

        if (order is null) return null;

        return (await GetOrdersAsync(firebaseUid, ct)).Items.FirstOrDefault(o => o.Id == orderId);
    }
}
