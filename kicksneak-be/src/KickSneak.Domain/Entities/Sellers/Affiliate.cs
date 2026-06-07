using KickSneak.Domain.Common;

namespace KickSneak.Domain.Entities.Sellers;

public class Affiliate : BaseEntity
{
    public string? AffiliateCompanyName { get; set; }
    public string? Details { get; set; }
    public string? PhotoPath { get; set; }
    public string? ContactEmail { get; set; }

    public ICollection<Seller> Sellers { get; set; } = [];
}