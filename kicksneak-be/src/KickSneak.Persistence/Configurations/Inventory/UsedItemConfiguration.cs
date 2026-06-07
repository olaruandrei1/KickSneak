using KickSneak.Domain.Entities.Inventory;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KickSneak.Persistence.Configurations.Inventory;

public class UsedItemConfiguration : IEntityTypeConfiguration<UsedItem>
{
    public void Configure(EntityTypeBuilder<UsedItem> builder)
    {
        builder.ToTable("used_items");
        builder.HasKey(x => x.Id);
        builder.HasOne(x => x.Product).WithMany(x => x.UsedItems).HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.Seller).WithMany().HasForeignKey(x => x.SellerId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.Size).WithMany().HasForeignKey(x => x.SizeId).OnDelete(DeleteBehavior.Restrict);
        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}