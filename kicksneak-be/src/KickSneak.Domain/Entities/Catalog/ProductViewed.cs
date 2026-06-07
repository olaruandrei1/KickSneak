using KickSneak.Domain.Entities.Users;

namespace KickSneak.Domain.Entities.Catalog;

public class ProductViewed
{
    public Guid UserId { get; set; }
    public Guid ProductId { get; set; }
    public int ViewCount { get; set; } = 1;

    public User User { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
