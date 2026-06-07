using KickSneak.Domain.Common;
using KickSneak.Domain.Entities.Users;
namespace KickSneak.Domain.Entities.Sellers;

public class Seller : BaseEntity
{
    public Guid UserId { get; set; }
    public DateTime? EnrollmentDate { get; set; }
    public bool IsBlocked { get; set; } = false;
    public bool IsSuspended { get; set; } = false;
    public string? Reason { get; set; }
    public Guid? AffiliateId { get; set; }
    public double? TrustScore { get; set; }
    public string? StoreName { get; set; }
    public string? Phone { get; set; }
    public string? City { get; set; }
    public string? SellType { get; set; }
    public string? ProductType { get; set; }
    public bool HasCompany { get; set; } = false;
    public string? CompanyName { get; set; }
    public string? VatNumber { get; set; }
    public User User { get; set; } = null!;
    public Affiliate? Affiliate { get; set; }
}