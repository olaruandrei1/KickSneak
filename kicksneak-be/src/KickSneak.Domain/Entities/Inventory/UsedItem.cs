using KickSneak.Domain.Common;
using KickSneak.Domain.Entities.Catalog;
using KickSneak.Domain.Entities.Sellers;
using KickSneak.Domain.Enums;
using Size = KickSneak.Domain.Entities.Catalog.Size;

namespace KickSneak.Domain.Entities.Inventory;

public class UsedItem : BaseEntity
{
    public Guid ProductId { get; set; }
    public Guid SellerId { get; set; }
    public Guid SizeId { get; set; }
    public double Price { get; set; }
    public ItemCondition Condition { get; set; }
    public ItemStatus StatusItem { get; set; } = ItemStatus.PendingReview;

    public Product Product { get; set; } = null!;
    public Seller Seller { get; set; } = null!;
    public Size? Size { get; set; } = null!;
    public ICollection<UsedItemPhoto> Photos { get; set; } = [];
}