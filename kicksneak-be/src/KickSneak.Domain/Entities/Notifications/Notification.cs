using KickSneak.Domain.Common;
using KickSneak.Domain.Entities.Users;

namespace KickSneak.Domain.Entities.Notifications;

public class Notification : BaseEntity
{
    public Guid UserId { get; set; }
    public string? Type { get; set; }
    public string? Title { get; set; }
    public string? Body { get; set; }
    public string? Href { get; set; }
    public bool IsRead { get; set; } = false;

    public User User { get; set; } = null!;
}