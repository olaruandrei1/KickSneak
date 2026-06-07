using KickSneak.Domain.Entities.Catalog;
using KickSneak.Domain.Entities.Users;

namespace KickSneak.Domain.Entities.Commerce;

public class UserFavorite
{
    public Guid UserId { get; set; }
    public Guid ProductId { get; set; }
    public bool IsDeleted { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
