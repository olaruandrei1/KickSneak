using KickSneak.Application.Contracts.Application;
using KickSneak.Application.Contracts.Persistence;
using KickSneak.Domain.DTOs.Profile;
using KickSneak.Domain.Entities.Users;

namespace KickSneak.Application.Implementations;

public sealed class ProfileService(IUnitOfWork uow) : IProfileService
{
    public async Task<UserProfileDto?> GetProfileAsync(string firebaseUid, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);

        if (user is null)
            return null;

        var addresses = await uow.UserAddresses.GetAsync(a => a.UserId == user.Id, ct);
        var orders = await uow.Orders.GetAsync(o => o.BuyerId == user.Id, ct);
        var seller = await uow.Sellers.GetFirstOrDefaultAsync(s => s.UserId == user.Id, ct);

        SellerInfoDto? sellerInfo = null;

        if (seller is not null)
        {
            var reviews = await uow.Reviews.GetAsync(r => r.SellerId == seller.Id, ct);

            var sellerOrders = await uow.Orders.GetAsync(o => o.StockItem != null && o.StockItem.SellerId == seller.Id, ct);

            sellerInfo = new SellerInfoDto(
                StoreName: seller.StoreName ?? $"{user.FirstName}'s Store",
                JoinedAt: (seller.EnrollmentDate ?? seller.CreatedAt).ToString("o"),
                TotalSales: sellerOrders.Count,
                Rating: reviews.Count > 0 ? reviews.Average(r => r.Score) : 0,
                Verified: !seller.IsSuspended && !seller.IsBlocked,
                Phone: seller.Phone,
                City: seller.City,
                SellType: seller.SellType,
                ProductType: seller.ProductType,
                HasCompany: seller.HasCompany,
                CompanyName: seller.CompanyName,
                VatNumber: seller.VatNumber
            );
        }

        return new UserProfileDto(
            Uid: user.FirebaseUid,
            Email: user.Contacts.FirstOrDefault(c => c.IsPrincipal)?.EmailAddress ?? string.Empty,
            DisplayName: $"{user.FirstName} {user.LastName}".Trim(),
            PhotoURL: user.ProfilePhoto,
            IsSeller: sellerInfo is not null,
            JoinedAt: user.CreatedAt.ToString("o"),
            TotalSpent: orders.Sum(o => o.TotalPrice),
            TotalOrders: orders.Count,
            Addresses: addresses.Select(a => new AddressDto(
                Id: a.Id,
                Label: a.AddressName ?? string.Empty,
                FirstName: a.FirstName ?? string.Empty,
                LastName: a.LastName ?? string.Empty,
                Street: $"{a.Street} {a.StreetNumber}".Trim(),
                City: a.City ?? string.Empty,
                County: a.County ?? string.Empty,
                Zip: a.PostalCode ?? string.Empty,
                Country: a.Country ?? string.Empty,
                Phone: a.Phone ?? string.Empty,
                AlternateEmail: null,
                IsDefault: a.IsPrincipal
            )).ToList(),
            SizePreferences: new SizePreferencesDto(
                FootwearEU: string.Empty,
                FootwearUS: string.Empty,
                FootwearUK: string.Empty,
                Tops: string.Empty,
                Bottoms: string.Empty,
                PreferredSystem: "EU"
            ),
            Seller: sellerInfo,
            GenderId: user.GenderId,
            BirthDate: user.BirthDate
        );
    }

    public async Task<UserProfileDto?> UpdateProfileAsync(string firebaseUid, UpdateProfileDto dto, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid.Equals(firebaseUid), ct);

        if (user is null) return null;

        if (dto.FirstName is not null) user.FirstName = dto.FirstName;
        if (dto.LastName is not null) user.LastName = dto.LastName;
        if (dto.PhotoURL is not null) user.ProfilePhoto = dto.PhotoURL;
        if (dto.GenderId is not null) user.GenderId = dto.GenderId;
        if (dto.BirthDate is not null) user.BirthDate = dto.BirthDate;

        user.ModifiedAt = DateTime.UtcNow;
        uow.Users.Update(user);

        await uow.SaveChangesAsync(ct);

        return await GetProfileAsync(firebaseUid, ct);
    }

    private async Task<User?> GetUserAsync(string firebaseUid, CancellationToken ct)
    => await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);

    public async Task<List<UserAddressDto>> GetAddressesAsync(string firebaseUid, CancellationToken ct = default)
    {
        var user = await GetUserAsync(firebaseUid, ct);
        if (user is null) return [];

        var addresses = await uow.UserAddresses.GetAsync(a => a.UserId == user.Id && !a.IsDeleted, ct);
        return addresses.Select(MapAddressToDto).ToList();
    }

    public async Task<UserAddressDto> UpsertAddressAsync(string firebaseUid, UserAddressDto dto, CancellationToken ct = default)
    {
        var user = await GetUserAsync(firebaseUid, ct);
        if (user is null) throw new Exception("User not found");

        UserAddress address;

        if (dto.Id.HasValue)
        {
            address = (await uow.UserAddresses.GetFirstOrDefaultAsync(
                a => a.Id == dto.Id.Value && a.UserId == user.Id, ct))!;
            if (address is null) throw new Exception("Address not found");
            MapDtoToAddress(dto, address);
            uow.UserAddresses.Update(address);
        }
        else
        {
            address = new UserAddress { UserId = user.Id };
            MapDtoToAddress(dto, address);
            await uow.UserAddresses.AddAsync(address, ct);
        }

        await uow.SaveChangesAsync(ct);
        return MapAddressToDto(address);
    }

    public async Task DeleteAddressAsync(string firebaseUid, Guid addressId, CancellationToken ct = default)
    {
        var user = await GetUserAsync(firebaseUid, ct);
        if (user is null) return;

        var address = await uow.UserAddresses.GetFirstOrDefaultAsync(
            a => a.Id == addressId && a.UserId == user.Id, ct);
        if (address is null) return;

        address.IsDeleted = true;
        uow.UserAddresses.Update(address);
        await uow.SaveChangesAsync(ct);
    }

    public async Task SetDefaultAddressAsync(string firebaseUid, Guid addressId, CancellationToken ct = default)
    {
        var user = await GetUserAsync(firebaseUid, ct);
        if (user is null) return;

        var addresses = (await uow.UserAddresses.GetAsync(
            a => a.UserId == user.Id && !a.IsDeleted, ct)).ToList();

        foreach (var a in addresses)
            a.IsPrincipal = a.Id == addressId;

        uow.UserAddresses.UpdateRange(addresses);
        await uow.SaveChangesAsync(ct);
    }

    public async Task<List<UserContactDto>> GetContactsAsync(string firebaseUid, CancellationToken ct = default)
    {
        var user = await GetUserAsync(firebaseUid, ct);
        if (user is null) return [];

        var contacts = await uow.UserContacts.GetAsync(c => c.UserId == user.Id && !c.IsDeleted, ct);
        return contacts.Select(MapContactToDto).ToList();
    }

    public async Task<UserContactDto> UpsertContactAsync(string firebaseUid, UserContactDto dto, CancellationToken ct = default)
    {
        var user = await GetUserAsync(firebaseUid, ct);
        if (user is null) throw new Exception("User not found");

        UserContact contact;

        if (dto.Id.HasValue)
        {
            contact = (await uow.UserContacts.GetFirstOrDefaultAsync(
                c => c.Id == dto.Id.Value && c.UserId == user.Id, ct))!;
            if (contact is null) throw new Exception("Contact not found");
            contact.Phone = dto.Phone;
            contact.EmailAddress = dto.EmailAddress;
            contact.IsPrincipal = dto.IsPrincipal;
            uow.UserContacts.Update(contact);
        }
        else
        {
            contact = new UserContact
            {
                UserId = user.Id,
                Phone = dto.Phone,
                EmailAddress = dto.EmailAddress,
                IsPrincipal = dto.IsPrincipal,
            };
            await uow.UserContacts.AddAsync(contact, ct);
        }

        await uow.SaveChangesAsync(ct);
        return MapContactToDto(contact);
    }

    public async Task DeleteContactAsync(string firebaseUid, Guid contactId, CancellationToken ct = default)
    {
        var user = await GetUserAsync(firebaseUid, ct);
        if (user is null) return;

        var contact = await uow.UserContacts.GetFirstOrDefaultAsync(
            c => c.Id == contactId && c.UserId == user.Id, ct);
        if (contact is null) return;

        contact.IsDeleted = true;
        uow.UserContacts.Update(contact);
        await uow.SaveChangesAsync(ct);
    }

    public async Task<UserSizePreferenceDto?> GetSizesAsync(string firebaseUid, CancellationToken ct = default)
    {
        var user = await GetUserAsync(firebaseUid, ct);
        if (user is null) return null;

        var pref = await uow.UserSizePreferences.GetFirstOrDefaultAsync(
            s => s.UserId == user.Id, ct);
        if (pref is null) return null;

        return new UserSizePreferenceDto(
            pref.PreferredSystem, pref.FootwearEU, pref.FootwearUS,
            pref.FootwearUK, pref.Tops, pref.Bottoms);
    }

    public async Task<UserSizePreferenceDto> SaveSizesAsync(string firebaseUid, UserSizePreferenceDto dto, CancellationToken ct = default)
    {
        var user = await GetUserAsync(firebaseUid, ct);
        if (user is null) throw new Exception("User not found");

        var pref = await uow.UserSizePreferences.GetFirstOrDefaultAsync(
            s => s.UserId == user.Id, ct);

        if (pref is null)
        {
            pref = new UserSizePreference { UserId = user.Id };
            MapDtoToSizes(dto, pref);
            await uow.UserSizePreferences.AddAsync(pref, ct);
        }
        else
        {
            MapDtoToSizes(dto, pref);
            uow.UserSizePreferences.Update(pref);
        }

        await uow.SaveChangesAsync(ct);
        return new UserSizePreferenceDto(
            pref.PreferredSystem, pref.FootwearEU, pref.FootwearUS,
            pref.FootwearUK, pref.Tops, pref.Bottoms);
    }

    private static UserAddressDto MapAddressToDto(UserAddress a) => new(
        a.Id, a.AddressName, a.IsPrincipal, a.FirstName, a.LastName,
        a.Country, a.City, a.County, a.Street, a.StreetNumber,
        a.Building, a.Stairwell, a.Floor, a.Apartment,
        a.AccessCode, a.PostalCode, a.DeliveryInstructions, a.Phone);

    private static void MapDtoToAddress(UserAddressDto dto, UserAddress a)
    {
        a.AddressName = dto.AddressName;
        a.IsPrincipal = dto.IsPrincipal;
        a.FirstName = dto.FirstName;
        a.LastName = dto.LastName;
        a.Country = dto.Country;
        a.City = dto.City;
        a.County = dto.County;
        a.Street = dto.Street;
        a.StreetNumber = dto.StreetNumber;
        a.Building = dto.Building;
        a.Stairwell = dto.Stairwell;
        a.Floor = dto.Floor;
        a.Apartment = dto.Apartment;
        a.AccessCode = dto.AccessCode;
        a.PostalCode = dto.PostalCode;
        a.DeliveryInstructions = dto.DeliveryInstructions;
        a.Phone = dto.Phone;
    }

    private static UserContactDto MapContactToDto(UserContact c) =>
        new(c.Id, c.IsPrincipal, c.Phone, c.EmailAddress);

    private static void MapDtoToSizes(UserSizePreferenceDto dto, UserSizePreference pref)
    {
        pref.PreferredSystem = dto.PreferredSystem;
        pref.FootwearEU = dto.FootwearEU;
        pref.FootwearUS = dto.FootwearUS;
        pref.FootwearUK = dto.FootwearUK;
        pref.Tops = dto.Tops;
        pref.Bottoms = dto.Bottoms;
    }
}
