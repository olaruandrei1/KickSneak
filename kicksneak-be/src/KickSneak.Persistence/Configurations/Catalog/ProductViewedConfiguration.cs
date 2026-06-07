using KickSneak.Domain.Entities.Catalog;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KickSneak.Persistence.Configurations.Catalog;

public class ProductViewedConfiguration : IEntityTypeConfiguration<ProductViewed>
{
    public void Configure(EntityTypeBuilder<ProductViewed> builder)
    {
        builder.ToTable("product_viewed");
        builder.HasKey(x => new { x.UserId, x.ProductId });
        builder.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
    }
}
