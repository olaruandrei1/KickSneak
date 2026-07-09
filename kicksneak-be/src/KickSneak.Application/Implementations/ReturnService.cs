using KickSneak.Application.Contracts.Application;
using KickSneak.Application.Contracts.Persistence;
using KickSneak.Domain.DTOs.Returns;
using KickSneak.Domain.Entities.Commerce;
using KickSneak.Domain.Enums;

namespace KickSneak.Application.Implementations;

public sealed class ReturnService(IUnitOfWork uow) : IReturnService
{
    public async Task<ReturnsResponseDto> GetReturnsAsync(string firebaseUid, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);

        if (user is null) return new ReturnsResponseDto([]);

        var returns = await uow.Returns.GetAsync(r => r.UserId == user.Id && !r.IsDeleted, ct,
            r => r.Order,
            r => r.Order.StockItem,
            r => r.Order.StockItem.Product,
            r => r.Order.StockItem.Product.Photos);

        var dtos = returns.Select(r =>
        {
            var product = r.Order.StockItem?.Product;
            return new ReturnDto(
                Id: r.Id,
                OrderId: r.OrderId,
                OrderRef: r.OrderId.ToString().ToUpperInvariant()[..8],
                ProductName: product?.Title ?? string.Empty,
                ProductImage: product?.Photos.FirstOrDefault(x => x.IsPrimary)?.PhotoUrl ?? string.Empty,
                Reason: r.Reason ?? string.Empty,
                Description: r.Description,
                Status: r.Status.ToString().ToLowerInvariant(),
                CreatedAt: r.CreatedAt.ToString("yyyy-MM-dd")
            );
        }).ToList();

        return new ReturnsResponseDto(dtos);
    }

    public async Task<ReturnDto> CreateReturnAsync(string firebaseUid, CreateReturnDto dto, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
        if (user is null) throw new Exception("User not found");

        var order = await uow.Orders.GetFirstOrDefaultAsync(
            o => o.Id == dto.OrderId && o.BuyerId == user.Id, ct,
            o => o.StockItem,
            o => o.StockItem.Product,
            o => o.StockItem.Product.Photos);

        if (order is null) throw new Exception("Order not found");

        var returnEntity = new Return
        {
            OrderId = dto.OrderId,
            UserId = user.Id,
            Reason = dto.Reason,
            Description = dto.Description,
            Status = ReturnStatus.Pending,
            CreatedBy = firebaseUid,
        };

        // Elevated: flips order + stock_items (seller-owned) back — a system operation.
        await uow.ExecuteElevatedAsync(async () =>
        {
            order.Status = OrderStatus.Refunded;
            uow.Orders.Update(order);

            if (order.StockItem is not null)
            {
                order.StockItem.StatusItem = ItemStatus.Active;
                uow.StockItems.Update(order.StockItem);
            }

            await uow.Returns.AddAsync(returnEntity, ct);
        }, ct);

        var product = order.StockItem?.Product;
        return new ReturnDto(
            Id: returnEntity.Id,
            OrderId: returnEntity.OrderId,
            OrderRef: returnEntity.OrderId.ToString().ToUpperInvariant()[..8],
            ProductName: product?.Title ?? string.Empty,
            ProductImage: product?.Photos.FirstOrDefault(x => x.IsPrimary)?.PhotoUrl ?? string.Empty,
            Reason: returnEntity.Reason ?? string.Empty,
            Description: returnEntity.Description,
            Status: returnEntity.Status.ToString().ToLowerInvariant(),
            CreatedAt: returnEntity.CreatedAt.ToString("yyyy-MM-dd")
        );
    }

    public async Task CancelOrderAsync(string firebaseUid, Guid orderId, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
        if (user is null) return;

        var order = await uow.Orders.GetFirstOrDefaultAsync(
            o => o.Id == orderId && o.BuyerId == user.Id, ct,
            o => o.StockItem);

        if (order is null) return;
        if (order.Status != OrderStatus.Pending && order.Status != OrderStatus.Confirmed) return;

        // Elevated: flips order + stock_items (seller-owned) back — a system operation.
        await uow.ExecuteElevatedAsync(async () =>
        {
            order.Status = OrderStatus.Cancelled;
            uow.Orders.Update(order);

            if (order.StockItem is not null)
            {
                order.StockItem.StatusItem = ItemStatus.Active;
                uow.StockItems.Update(order.StockItem);
            }
        }, ct);
    }
}
