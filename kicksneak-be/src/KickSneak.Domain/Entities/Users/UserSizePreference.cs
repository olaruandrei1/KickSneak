using KickSneak.Domain.Common;

namespace KickSneak.Domain.Entities.Users;

public class UserSizePreference : BaseEntity
{
    public Guid UserId { get; set; }
    public string? PreferredSystem { get; set; } = "EU";
    public string? FootwearEU { get; set; }
    public string? FootwearUS { get; set; }
    public string? FootwearUK { get; set; }
    public string? Tops { get; set; }
    public string? Bottoms { get; set; }
    public User User { get; set; } = null!;
}
