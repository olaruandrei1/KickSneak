using KickSneak.Application.Contracts.Application;
using KickSneak.Application.Contracts.Persistence;
using KickSneak.Domain.DTOs.Reviews;
using KickSneak.Domain.Entities.Commerce;
using KickSneak.Domain.Enums;

namespace KickSneak.Application.Implementations;

public sealed class ReviewService(IUnitOfWork uow) : IReviewService
{
    public async Task<ReviewResponseDto> CreateReviewAsync(string firebaseUid, CreateReviewDto dto, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
        if (user is null) throw new Exception("User not found");

        var order = await uow.Orders.GetFirstOrDefaultAsync(
            o => o.Id == dto.OrderId && o.BuyerId == user.Id, ct,
            o => o.StockItem,
            o => o.StockItem.Seller);

        if (order is null) throw new Exception("Order not found");
        if (order.Status != OrderStatus.Delivered) throw new Exception("Order not delivered");

        var existing = await uow.Reviews.GetFirstOrDefaultAsync(
            r => r.OrderId == dto.OrderId, ct);
        if (existing is not null) throw new Exception("Already reviewed");

        var sellerId = order.StockItem?.SellerId ?? Guid.Empty;

        var review = new Review
        {
            BuyerId = user.Id,
            SellerId = sellerId,
            OrderId = dto.OrderId,
            Score = Math.Clamp(dto.Score, 1, 5),
            Title = dto.Title,
            Comment = dto.Comment,
            CreatedBy = firebaseUid,
        };

        await uow.Reviews.AddAsync(review, ct);
        await uow.SaveChangesAsync(ct);

        return new ReviewResponseDto(review.Id, review.Score, review.Title, review.Comment, review.CreatedAt.ToString("yyyy-MM-dd"));
    }

    public async Task<bool> HasReviewAsync(string firebaseUid, Guid orderId, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
        if (user is null) return false;
        return await uow.Reviews.ExistsAsync(r => r.OrderId == orderId && r.BuyerId == user.Id, ct);
    }
}
