using KickSneak.Domain.Common;

namespace KickSneak.Domain.Entities.Users;

public class WebPushSubscription : BaseEntity
{
    public Guid UserId { get; set; }
    public string? Endpoint { get; set; }
    public string? AuthKey { get; set; }
    public string? PrivateKey { get; set; }

    public User User { get; set; } = null!;
}