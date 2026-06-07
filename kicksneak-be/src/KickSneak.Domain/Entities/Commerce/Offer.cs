using KickSneak.Domain.Common;
using KickSneak.Domain.Entities.Catalog;
using KickSneak.Domain.Entities.Users;
using KickSneak.Domain.Enums;
using System.Drawing;
using Size = KickSneak.Domain.Entities.Catalog.Size;

namespace KickSneak.Domain.Entities.Commerce;

public class Offer : BaseEntity
{
    public Guid ProductId { get; set; }
    public Guid SizeId { get; set; }
    public double GivenPrice { get; set; }
    public Guid BuyerId { get; set; }
    public OfferStatus Status { get; set; } = OfferStatus.Pending;
    public DateTime? ExpiresAt { get; set; }

    public Product Product { get; set; } = null!;
    public Size? Size { get; set; } = null!;
    public User Buyer { get; set; } = null!;
}