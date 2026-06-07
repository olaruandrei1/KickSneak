using KickSneak.Domain.Common;

namespace KickSneak.Domain.Entities.Catalog;

public class Size : BaseEntity
{
    public Guid SizeTypeId { get; set; }
    public string? SizeLabel { get; set; }
    public string? SizeUs { get; set; }
    public string? SizeEu { get; set; }
    public string? SizeUk { get; set; }
    public double? SizeCm { get; set; }

    public SizeType SizeType { get; set; } = null!;
}