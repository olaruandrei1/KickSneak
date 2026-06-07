using KickSneak.Domain.Common;
using KickSneak.Domain.Entities.Inventory;
using KickSneak.Domain.Entities.Users;
using KickSneak.Domain.Enums;

namespace KickSneak.Domain.Entities.Commerce;

public class Order : BaseEntity
{
    public Guid? StockItemId { get; set; }
    public Guid? UsedItemId { get; set; }
    public Guid BuyerId { get; set; }
    public Guid? BuyerAddressId { get; set; }
    public Guid? SellerAddressId { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    public double TotalPrice { get; set; }
    public string? TrackingNumber { get; set; }

    public StockItem? StockItem { get; set; }
    public UsedItem? UsedItem { get; set; }
    public User Buyer { get; set; } = null!;
    public UserAddress? BuyerAddress { get; set; }
    public UserAddress? SellerAddress { get; set; }
    public Review? Review { get; set; }
}