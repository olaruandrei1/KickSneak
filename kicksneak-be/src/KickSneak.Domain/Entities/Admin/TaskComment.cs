using KickSneak.Domain.Common;
using KickSneak.Domain.Entities.Users;

namespace KickSneak.Domain.Entities.Admin;

public class TaskComment : BaseEntity
{
    public Guid TaskId { get; set; }
    public Guid UserId { get; set; }
    public string? Text { get; set; }

    public AppTask Task { get; set; } = null!;
    public User User { get; set; } = null!;
}