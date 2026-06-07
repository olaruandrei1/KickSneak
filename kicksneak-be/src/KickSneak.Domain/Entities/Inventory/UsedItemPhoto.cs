using KickSneak.Domain.Common;

namespace KickSneak.Domain.Entities.Inventory;

public class UsedItemPhoto : BaseEntity
{
    public Guid UsedItemId { get; set; }
    public string? PhotoUrl { get; set; }
    public bool IsPrimary { get; set; } = false;
    public int? DisplayOrder { get; set; }

    public UsedItem UsedItem { get; set; } = null!;
}