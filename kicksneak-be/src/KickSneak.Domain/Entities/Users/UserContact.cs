using KickSneak.Domain.Common;

namespace KickSneak.Domain.Entities.Users;

public class UserContact : BaseEntity
{
    public Guid UserId { get; set; }
    public bool IsPrincipal { get; set; } = false;
    public string? Phone { get; set; }
    public string? EmailAddress { get; set; }
    public bool EmailAddressVerified { get; set; } = false;

    public User User { get; set; } = null!;
}