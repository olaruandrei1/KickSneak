using KickSneak.Domain.Common;
using KickSneak.Domain.Entities.Inventory;
using System.Drawing;
using System.Net.ServerSentEvents;

namespace KickSneak.Domain.Entities.Catalog;

public class Product : BaseEntity
{
    public Guid? BrandId { get; set; }
    public Guid? CategoryId { get; set; }
    public Guid? GenderId { get; set; }
    public Guid? FitId { get; set; }
    public string? Title { get; set; }
    public string? ShortDescription { get; set; }
    public string? Description { get; set; }
    public Guid? MaterialId { get; set; }
    public Guid? ColorId { get; set; }
    public double? RetailPrice { get; set; }
    public DateTime? ReleaseDate { get; set; }
    public string? ProductUniversalId { get; set; }

    public Brand? Brand { get; set; }
    public Category? Category { get; set; }
    public Gender? Gender { get; set; }
    public Fit? Fit { get; set; }
    public Material? Material { get; set; }
    public Color? Color { get; set; }
    public ICollection<ProductPhoto> Photos { get; set; } = [];
    public ICollection<StockItem> StockItems { get; set; } = [];
    public ICollection<UsedItem> UsedItems { get; set; } = [];
}