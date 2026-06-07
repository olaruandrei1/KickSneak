using KickSneak.Domain.Entities.Sellers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KickSneak.Persistence.Configurations.Sellers;

public class AffiliateConfiguration : IEntityTypeConfiguration<Affiliate>
{
    public void Configure(EntityTypeBuilder<Affiliate> builder)
    {
        builder.ToTable("affiliates");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.AffiliateCompanyName).HasMaxLength(255);
        builder.Property(x => x.PhotoPath).HasMaxLength(500);
        builder.Property(x => x.ContactEmail).HasMaxLength(255);
        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}