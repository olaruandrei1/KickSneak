using KickSneak.Domain.Common;
using KickSneak.Domain.Entities.Users;

namespace KickSneak.Domain.Entities.Auctions;

public class AutoBid : BaseEntity
{
    public Guid AuctionId { get; set; }
    public Guid UserId { get; set; }
    public double MaxAmount { get; set; }
    public bool IsActive { get; set; } = true;

    public Auction Auction { get; set; } = null!;
    public User User { get; set; } = null!;
}