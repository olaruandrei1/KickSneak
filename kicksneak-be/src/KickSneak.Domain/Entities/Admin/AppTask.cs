using KickSneak.Domain.Common;
using KickSneak.Domain.Entities.Users;
using KickSneak.Domain.Enums;
using TaskStatus = KickSneak.Domain.Enums.TaskStatus;

namespace KickSneak.Domain.Entities.Admin;

public class AppTask : BaseEntity
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public TaskStatus Status { get; set; } = TaskStatus.Todo;
    public Guid? AssignedTo { get; set; }
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;
    public DateTime? DueDate { get; set; }

    public User? AssignedUser { get; set; }
    public ICollection<TaskComment> Comments { get; set; } = [];
}