using KickSneak.Domain.Entities.Commerce;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KickSneak.Persistence.Configurations.Commerce;

public class UserCartConfiguration : IEntityTypeConfiguration<UserCart>
{
    public void Configure(EntityTypeBuilder<UserCart> builder)
    {
        builder.ToTable("user_cart");
        builder.HasKey(x => x.Id);
        builder.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.StockItem).WithMany().HasForeignKey(x => x.StockItemId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.UsedItem).WithMany().HasForeignKey(x => x.UsedItemId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(x => new { x.UserId, x.StockItemId }).IsUnique().HasFilter("\"StockItemId\" IS NOT NULL");
        builder.HasIndex(x => new { x.UserId, x.UsedItemId }).IsUnique().HasFilter("\"UsedItemId\" IS NOT NULL");
        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}