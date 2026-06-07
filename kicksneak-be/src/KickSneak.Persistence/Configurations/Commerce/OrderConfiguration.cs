using KickSneak.Domain.Entities.Commerce;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KickSneak.Persistence.Configurations.Commerce;

public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("orders");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.TrackingNumber).HasMaxLength(100);
        builder.HasOne(x => x.StockItem).WithMany().HasForeignKey(x => x.StockItemId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.UsedItem).WithMany().HasForeignKey(x => x.UsedItemId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Buyer).WithMany().HasForeignKey(x => x.BuyerId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.BuyerAddress).WithMany().HasForeignKey(x => x.BuyerAddressId).OnDelete(DeleteBehavior.SetNull);
        builder.HasOne(x => x.SellerAddress).WithMany().HasForeignKey(x => x.SellerAddressId).OnDelete(DeleteBehavior.SetNull);
        builder.HasIndex(x => x.StockItemId).IsUnique().HasFilter("\"StockItemId\" IS NOT NULL");
        builder.HasIndex(x => x.UsedItemId).IsUnique().HasFilter("\"UsedItemId\" IS NOT NULL");
        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}