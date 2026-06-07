using KickSneak.Domain.Common;
using KickSneak.Domain.Entities.Inventory;
using KickSneak.Domain.Entities.Sellers;
using KickSneak.Domain.Enums;

namespace KickSneak.Domain.Entities.Auctions;

public class Auction : BaseEntity
{
    public Guid StockItemId { get; set; }
    public Guid SellerId { get; set; }
    public double StartPrice { get; set; }
    public double CurrentPrice { get; set; }
    public double? ReservePrice { get; set; }
    public bool ReserveMet { get; set; } = false;
    public int BidCount { get; set; } = 0;
    public int ExtensionCount { get; set; } = 0;
    public DateTime StartsAt { get; set; }
    public DateTime EndsAt { get; set; }
    public AuctionStatus Status { get; set; } = AuctionStatus.Scheduled;

    public StockItem StockItem { get; set; } = null!;
    public Seller Seller { get; set; } = null!;
    public ICollection<Bid> Bids { get; set; } = [];
    public ICollection<AutoBid> AutoBids { get; set; } = [];
}