using Dapper;
using KickSneak.Application.Contracts.Persistence;
using KickSneak.Domain.Common;
using KickSneak.Domain.ConfigurableObjects;
using KickSneak.Domain.Entities.Admin;
using KickSneak.Domain.Entities.Auctions;
using KickSneak.Domain.Entities.Catalog;
using KickSneak.Domain.Entities.Commerce;
using KickSneak.Domain.Entities.Inventory;
using KickSneak.Domain.Entities.Notifications;
using KickSneak.Domain.Entities.Sellers;
using KickSneak.Domain.Entities.Users;
using KickSneak.Persistence.Context;
using KickSneak.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;
using Color = KickSneak.Domain.Entities.Catalog.Color;
using Size = KickSneak.Domain.Entities.Catalog.Size;

namespace KickSneak.Persistence;

public class UnitOfWork(AppDbContext context, RlsContext rlsContext) : IUnitOfWork
{
    private static readonly Dictionary<DbRole, string> RoleMap = new()
    {
        [DbRole.Guest] = "ks_guest",
        [DbRole.User] = "ks_user",
        [DbRole.Seller] = "ks_seller",
        [DbRole.Admin] = "ks_admin",
    };

    public IRepository<Product> Products { get; } = new Repository<Product>(context);
    public IRepository<ProductPhoto> ProductPhotos { get; } = new Repository<ProductPhoto>(context);
    public IRepository<Brand> Brands { get; } = new Repository<Brand>(context);
    public IRepository<Category> Categories { get; } = new Repository<Category>(context);
    public IRepository<Color> Colors { get; } = new Repository<Color>(context);
    public IRepository<Material> Materials { get; } = new Repository<Material>(context);
    public IRepository<Fit> Fits { get; } = new Repository<Fit>(context);
    public IRepository<Size> Sizes { get; } = new Repository<Size>(context);
    public IRepository<SizeType> SizeTypes { get; } = new Repository<SizeType>(context);
    public IRepository<Gender> Genders { get; } = new Repository<Gender>(context);
    public IRepository<ProductViewed> ProductViews { get; } = new Repository<ProductViewed>(context);
    public IRepository<Return> Returns { get; } = new Repository<Return>(context);

    public IRepository<UserSizePreference> UserSizePreferences { get; } = new Repository<UserSizePreference>(context);
    public IRepository<User> Users { get; } = new Repository<User>(context);
    public IRepository<Role> Roles { get; } = new Repository<Role>(context);
    public IRepository<UserAddress> UserAddresses { get; } = new Repository<UserAddress>(context);
    public IRepository<UserContact> UserContacts { get; } = new Repository<UserContact>(context);
    public IRepository<WebPushSubscription> PushSubscriptions { get; } = new Repository<WebPushSubscription>(context);

    public IRepository<Seller> Sellers { get; } = new Repository<Seller>(context);
    public IRepository<Affiliate> Affiliates { get; } = new Repository<Affiliate>(context);

    public IRepository<StockItem> StockItems { get; } = new Repository<StockItem>(context);
    public IRepository<UsedItem> UsedItems { get; } = new Repository<UsedItem>(context);
    public IRepository<UsedItemPhoto> UsedItemPhotos { get; } = new Repository<UsedItemPhoto>(context);

    public IRepository<Order> Orders { get; } = new Repository<Order>(context);
    public IRepository<UserCart> Cart { get; } = new Repository<UserCart>(context);
    public IRepository<UserFavorite> Favorites { get; } = new Repository<UserFavorite>(context);
    public IRepository<Offer> Offers { get; } = new Repository<Offer>(context);
    public IRepository<Review> Reviews { get; } = new Repository<Review>(context);

    public IRepository<Auction> Auctions { get; } = new Repository<Auction>(context);
    public IRepository<Bid> Bids { get; } = new Repository<Bid>(context);
    public IRepository<AutoBid> AutoBids { get; } = new Repository<AutoBid>(context);

    public IRepository<Notification> Notifications { get; } = new Repository<Notification>(context);

    public IRepository<AppTask> Tasks { get; } = new Repository<AppTask>(context);
    public IRepository<TaskComment> TaskComments { get; } = new Repository<TaskComment>(context);

    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        var strategy = context.Database.CreateExecutionStrategy();

        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await context.Database.BeginTransactionAsync(ct);
            
            await ApplyRlsAsync(ct);
            
            var result = await context.SaveChangesAsync(CancellationToken.None);
            
            await transaction.CommitAsync(CancellationToken.None);

            return result;
        });
    }

    public async Task ExecuteInTransactionAsync(Func<Task> action, CancellationToken ct = default)
    {
        await using var transaction = await context.Database.BeginTransactionAsync(ct);

        try
        {
            await ApplyRlsAsync(ct);

            await action();

            await context.SaveChangesAsync(ct);

            await transaction.CommitAsync(ct);
        }
        catch
        {
            await transaction.RollbackAsync(ct);
            throw;
        }
    }

    public async ValueTask DisposeAsync()
    => await context.DisposeAsync();

    private async Task ApplyRlsAsync(CancellationToken ct)
    {
        if (rlsContext.Role == DbRole.Guest)
            return;

        var role = rlsContext.Role switch
        {
            DbRole.User => "ks_user",
            DbRole.Seller => "ks_seller",
            DbRole.Admin => "ks_admin",
            _ => (string?)null
        };

        if (role is null) return;

        var conn = context.Database.GetDbConnection();

        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

        await conn.ExecuteAsync(
            $"SET LOCAL ROLE {role}; SELECT set_config('app.current_user_id', @UserId, true);",
            new { UserId = rlsContext.UserId }
        );
    }
}