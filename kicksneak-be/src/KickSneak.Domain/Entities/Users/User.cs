using KickSneak.Domain.Common;
using KickSneak.Domain.Entities.Catalog;
using System.Data;

namespace KickSneak.Domain.Entities.Users;

public class User : BaseEntity
{
    public string FirebaseUid { get; set; } = null!;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public Guid? GenderId { get; set; }
    public DateTime? BirthDate { get; set; }
    public Guid? RoleId { get; set; }
    public string? ProfilePhoto { get; set; }
    public bool IsSuspended { get; set; } = false;
    public bool IsBlocked { get; set; } = false;

    public Gender? Gender { get; set; }
    public Role? Role { get; set; }
    public ICollection<UserAddress> Addresses { get; set; } = [];
    public ICollection<UserContact> Contacts { get; set; } = [];
    public UserSizePreference? SizePreference { get; set; }
    public ICollection<WebPushSubscription> PushSubscriptions { get; set; } = [];
}