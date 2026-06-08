namespace KickSneak.Domain.Common;

public enum DbRole
{
    Guest,
    User,
    Seller,
    Admin
}

public sealed class RlsContext
{
    public DbRole Role { get; set; } = DbRole.Guest;
    public string UserId { get; set; } = Guid.Empty.ToString();
}
