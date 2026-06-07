using FirebaseAdmin.Auth;
using KickSneak.Application.Contracts.Application;
using KickSneak.Application.Contracts.Persistence;
using KickSneak.Domain.DTOs.Auth;
using KickSneak.Domain.Entities.Users;

namespace KickSneak.Application.Implementations;


public sealed class AuthService(IUnitOfWork uow) : IAuthService
{
    private readonly string USER_ROLE = "user";

    public async Task<AuthUserDto> LoginAsync(
        string firebaseUid, string? email, string? displayName, string? picture,
        CancellationToken ct = default
    )
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);

        var isNew = user is null;

        if (user is not null && user.IsDeleted)
        {
            user.IsDeleted = false;
            user.IsBlocked = false;
            user.IsSuspended = false;

            uow.Users.Update(user);
            
            await uow.SaveChangesAsync(ct);
        }
        else if (isNew)
        {
            var defaultRole = await uow.Roles.GetFirstOrDefaultAsync(r => r.Name == "user", ct);
            var parts = (displayName ?? string.Empty).Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);

            user = new User
            {
                FirebaseUid = firebaseUid,
                FirstName = parts.ElementAtOrDefault(0),
                LastName = parts.ElementAtOrDefault(1),
                ProfilePhoto = picture,
                RoleId = defaultRole?.Id,
                GenderId = null,
            };

            await uow.Users.AddAsync(user, ct);
            await uow.SaveChangesAsync(ct);
        }

        return new AuthUserDto(
            Id: user!.Id,
            FirebaseUid: user.FirebaseUid,
            Email: email,
            FirstName: user.FirstName,
            LastName: user.LastName,
            ProfilePhoto: user.ProfilePhoto,
            IsNewUser: isNew
        );
    }

    public async Task DeleteAccountAsync(string firebaseUid, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
        if (user is null) return;

        user.IsDeleted = true;
        uow.Users.Update(user);
        await uow.SaveChangesAsync(ct);

        await FirebaseAuth.DefaultInstance.RevokeRefreshTokensAsync(firebaseUid);
    }
}
