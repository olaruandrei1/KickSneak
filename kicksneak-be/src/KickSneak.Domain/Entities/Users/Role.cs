using KickSneak.Domain.Common;
using KickSneak.Domain.Enums;

namespace KickSneak.Domain.Entities.Users;

public class Role : BaseEntity
{
    public string? Name { get; set; }
    public RoleLevel Level { get; set; }

    public ICollection<User> Users { get; set; } = [];
}