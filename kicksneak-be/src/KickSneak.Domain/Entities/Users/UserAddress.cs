using KickSneak.Domain.Common;

namespace KickSneak.Domain.Entities.Users;

public class UserAddress : BaseEntity
{
    public Guid UserId { get; set; }
    public string? AddressName { get; set; }
    public bool IsPrincipal { get; set; } = false;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Country { get; set; }
    public string? City { get; set; }
    public string? County { get; set; }
    public string? Street { get; set; }
    public string? StreetNumber { get; set; }
    public string? Building { get; set; }
    public string? Stairwell { get; set; }
    public string? Floor { get; set; }
    public string? Apartment { get; set; }
    public string? AccessCode { get; set; }
    public string? PostalCode { get; set; }
    public string? DeliveryInstructions { get; set; }
    public string? Phone { get; set; }

    public User User { get; set; } = null!;
}