using KickSneak.Domain.Entities.Admin;
using KickSneak.Domain.Entities.Auctions;
using KickSneak.Domain.Entities.Catalog;
using KickSneak.Domain.Entities.Commerce;
using KickSneak.Domain.Entities.Inventory;
using KickSneak.Domain.Entities.Notifications;
using KickSneak.Domain.Entities.Sellers;
using KickSneak.Domain.Entities.Users;
using Color = KickSneak.Domain.Entities.Catalog.Color;

namespace KickSneak.Application.Contracts.Persistence;

public interface IUnitOfWork : IAsyncDisposable
{
    IRepository<Product> Products { get; }
    IRepository<UserFavorite> Favorites { get; }
    IRepository<ProductPhoto> ProductPhotos { get; }
    IRepository<Brand> Brands { get; }
    IRepository<Category> Categories { get; }
    IRepository<Color> Colors { get; }
    IRepository<Material> Materials { get; }
    IRepository<Fit> Fits { get; }
    IRepository<Size> Sizes { get; }
    IRepository<SizeType> SizeTypes { get; }
    IRepository<Gender> Genders { get; }
    IRepository<ProductViewed> ProductViews { get; }
    IRepository<Return> Returns { get; }

    IRepository<UserSizePreference> UserSizePreferences { get; }
    IRepository<User> Users { get; }
    IRepository<Role> Roles { get; }
    IRepository<UserAddress> UserAddresses { get; }
    IRepository<UserContact> UserContacts { get; }
    IRepository<WebPushSubscription> PushSubscriptions { get; }

    IRepository<Seller> Sellers { get; }
    IRepository<Affiliate> Affiliates { get; }

    IRepository<StockItem> StockItems { get; }
    IRepository<UsedItem> UsedItems { get; }
    IRepository<UsedItemPhoto> UsedItemPhotos { get; }

    IRepository<Order> Orders { get; }
    IRepository<UserCart> Cart { get; }
    IRepository<Offer> Offers { get; }
    IRepository<Review> Reviews { get; }

    IRepository<Auction> Auctions { get; }
    IRepository<Bid> Bids { get; }
    IRepository<AutoBid> AutoBids { get; }

    IRepository<Notification> Notifications { get; }
    IRepository<NotificationSetting> NotificationSettings { get; }
    IRepository<NotificationBroadcast> NotificationBroadcasts { get; }

    IRepository<AppTask> Tasks { get; }
    IRepository<TaskComment> TaskComments { get; }

    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task ExecuteInTransactionAsync(Func<Task> action, CancellationToken ct = default);

    /// <summary>
    /// Runs a write as the base connection role (ks_owner), bypassing RLS / SET ROLE.
    /// For system operations that legitimately span multiple roles' tables
    /// (e.g. returns/cancellations that flip stock_items back to Active).
    /// Ownership must be enforced by the caller's queries.
    /// </summary>
    Task ExecuteElevatedAsync(Func<Task> action, CancellationToken ct = default);
}
