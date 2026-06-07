using KickSneak.Domain.Entities.Catalog;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KickSneak.Persistence.Configurations.Catalog;

public class SizeTypeConfiguration : IEntityTypeConfiguration<SizeType>
{
    public void Configure(EntityTypeBuilder<SizeType> builder)
    {
        builder.ToTable("size_types");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(50);
    }
}