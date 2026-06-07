using KickSneak.Domain.Common;
using KickSneak.Domain.Entities.Inventory;
using KickSneak.Domain.Entities.Users;

namespace KickSneak.Domain.Entities.Commerce;

public class UserCart : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid? StockItemId { get; set; }
    public Guid? UsedItemId { get; set; }

    public User User { get; set; } = null!;
    public StockItem? StockItem { get; set; }
    public UsedItem? UsedItem { get; set; }
}