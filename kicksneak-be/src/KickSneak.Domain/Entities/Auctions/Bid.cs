using KickSneak.Domain.Common;
using KickSneak.Domain.Entities.Users;

namespace KickSneak.Domain.Entities.Auctions;

public class Bid : BaseEntity
{
    public Guid AuctionId { get; set; }
    public Guid BidderId { get; set; }
    public double Amount { get; set; }
    public DateTime PlacedAt { get; set; } = DateTime.UtcNow;
    public bool IsAutoBid { get; set; } = false;
    public bool TriggeredExtension { get; set; } = false;

    public Auction Auction { get; set; } = null!;
    public User Bidder { get; set; } = null!;
}