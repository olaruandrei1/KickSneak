using KickSneak.Domain.Common;

namespace KickSneak.Domain.Entities.Catalog;

public class SizeType : BaseEntity
{
    public string? Name { get; set; }

    public ICollection<Size> Sizes { get; set; } = [];
}