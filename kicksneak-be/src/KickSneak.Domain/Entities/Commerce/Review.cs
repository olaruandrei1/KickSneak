using KickSneak.Domain.Common;
using KickSneak.Domain.Entities.Sellers;
using KickSneak.Domain.Entities.Users;

namespace KickSneak.Domain.Entities.Commerce;

public class Review : BaseEntity
{
    public Guid BuyerId { get; set; }
    public Guid SellerId { get; set; }
    public Guid OrderId { get; set; }
    public double Score { get; set; }
    public string? Title { get; set; }
    public string? Comment { get; set; }

    public User Buyer { get; set; } = null!;
    public Seller Seller { get; set; } = null!;
    public Order Order { get; set; } = null!;
}