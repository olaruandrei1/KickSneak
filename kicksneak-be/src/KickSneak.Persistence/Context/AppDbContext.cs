using KickSneak.Domain.Entities.Admin;
using KickSneak.Domain.Entities.Auctions;
using KickSneak.Domain.Entities.Catalog;
using KickSneak.Domain.Entities.Commerce;
using KickSneak.Domain.Entities.Inventory;
using KickSneak.Domain.Entities.Notifications;
using KickSneak.Domain.Entities.Sellers;
using KickSneak.Domain.Entities.Users;
using Microsoft.EntityFrameworkCore;

namespace KickSneak.Persistence.Context;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductPhoto> ProductPhotos => Set<ProductPhoto>();
    public DbSet<Brand> Brands => Set<Brand>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Color> Colors => Set<Color>();
    public DbSet<Material> Materials => Set<Material>();
    public DbSet<Fit> Fits => Set<Fit>();
    public DbSet<Size> Sizes => Set<Size>();
    public DbSet<SizeType> SizeTypes => Set<SizeType>();
    public DbSet<Gender> Genders => Set<Gender>();
    public DbSet<ProductViewed> ProductViews => Set<ProductViewed>();

    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserAddress> UserAddresses => Set<UserAddress>();
    public DbSet<UserContact> UserContacts => Set<UserContact>();
    public DbSet<WebPushSubscription> PushSubscriptions => Set<WebPushSubscription>();

    public DbSet<Seller> Sellers => Set<Seller>();
    public DbSet<Affiliate> Affiliates => Set<Affiliate>();

    public DbSet<StockItem> StockItems => Set<StockItem>();
    public DbSet<UsedItem> UsedItems => Set<UsedItem>();
    public DbSet<UsedItemPhoto> UsedItemPhotos => Set<UsedItemPhoto>();
    public DbSet<Return> Returns { get; set; }

    public DbSet<Order> Orders => Set<Order>();
    public DbSet<UserCart> Cart => Set<UserCart>();
    public DbSet<Offer> Offers => Set<Offer>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<UserFavorite> Favorites => Set<UserFavorite>();

    public DbSet<Auction> Auctions => Set<Auction>();
    public DbSet<Bid> Bids => Set<Bid>();
    public DbSet<AutoBid> AutoBids => Set<AutoBid>();

    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<NotificationSetting> NotificationSettings => Set<NotificationSetting>();
    public DbSet<NotificationBroadcast> NotificationBroadcasts => Set<NotificationBroadcast>();

    public DbSet<AppTask> Tasks => Set<AppTask>();
    public DbSet<TaskComment> TaskComments => Set<TaskComment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}