using KickSneak.Domain.Entities.Sellers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KickSneak.Persistence.Configurations.Sellers;

public class SellerConfiguration : IEntityTypeConfiguration<Seller>
{
    public void Configure(EntityTypeBuilder<Seller> builder)
    {
        builder.ToTable("sellers");

        builder.HasKey(x => x.Id);
        
        builder.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.Affiliate).WithMany(x => x.Sellers).HasForeignKey(x => x.AffiliateId).OnDelete(DeleteBehavior.SetNull);

        builder.Property(s => s.StoreName).HasMaxLength(200);
        builder.Property(s => s.Phone).HasMaxLength(50);
        builder.Property(s => s.City).HasMaxLength(100);
        builder.Property(s => s.SellType).HasMaxLength(100);
        builder.Property(s => s.ProductType).HasMaxLength(100);
        builder.Property(s => s.CompanyName).HasMaxLength(200);
        builder.Property(s => s.VatNumber).HasMaxLength(50);

        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}