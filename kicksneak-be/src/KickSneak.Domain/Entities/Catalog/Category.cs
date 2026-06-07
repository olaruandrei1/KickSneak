using KickSneak.Domain.Common;

namespace KickSneak.Domain.Entities.Catalog;

public class Category : BaseEntity
{
    public string? Name { get; set; }
    public Guid? ParentId { get; set; }

    public Category? Parent { get; set; }
    public ICollection<Category> SubCategories { get; set; } = [];
    public ICollection<Product> Products { get; set; } = [];
}