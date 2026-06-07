using KickSneak.Domain.Common;

namespace KickSneak.Domain.Entities.Catalog;

public class ProductPhoto : BaseEntity
{
    public Guid ProductId { get; set; }
    public string? PhotoUrl { get; set; }
    public bool IsPrimary { get; set; } = false;
    public int? DisplayOrder { get; set; }

    public Product Product { get; set; } = null!;
}