using KickSneak.Domain.Common;
using KickSneak.Domain.Entities.Users;
using KickSneak.Domain.Enums;

namespace KickSneak.Domain.Entities.Commerce;

public class Return : BaseEntity
{
    public Guid OrderId { get; set; }
    public Guid UserId { get; set; }
    public string? Reason { get; set; }
    public string? Description { get; set; }
    public ReturnStatus Status { get; set; } = ReturnStatus.Pending;
    public Order Order { get; set; } = null!;
    public User User { get; set; } = null!;
}
