using KickSneak.Domain.Entities.Catalog;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KickSneak.Persistence.Configurations.Catalog;

public class FitConfiguration : IEntityTypeConfiguration<Fit>
{
    public void Configure(EntityTypeBuilder<Fit> builder)
    {
        builder.ToTable("fits");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(100);
        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}