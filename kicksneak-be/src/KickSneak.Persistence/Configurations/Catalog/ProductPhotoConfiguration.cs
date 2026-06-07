using KickSneak.Domain.Entities.Catalog;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KickSneak.Persistence.Configurations.Catalog;

public class ProductPhotoConfiguration : IEntityTypeConfiguration<ProductPhoto>
{
    public void Configure(EntityTypeBuilder<ProductPhoto> builder)
    {
        builder.ToTable("product_photos");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.PhotoUrl).HasMaxLength(500);
        builder.HasOne(x => x.Product).WithMany(x => x.Photos).HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}