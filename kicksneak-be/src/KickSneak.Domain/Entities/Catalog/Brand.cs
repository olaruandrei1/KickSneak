using KickSneak.Domain.Common;

namespace KickSneak.Domain.Entities.Catalog;

public class Brand : BaseEntity
{
    public string? Name { get; set; }
    public Guid? ParentId { get; set; }

    public Brand? Parent { get; set; }
    public ICollection<Brand> SubBrands { get; set; } = [];
    public ICollection<Product> Products { get; set; } = [];
}