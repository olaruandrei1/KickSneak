using KickSneak.Domain.Entities.Catalog;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KickSneak.Persistence.Configurations.Catalog;

public class SizeConfiguration : IEntityTypeConfiguration<Size>
{
    public void Configure(EntityTypeBuilder<Size> builder)
    {
        builder.ToTable("sizes");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.SizeLabel).HasMaxLength(20);
        builder.Property(x => x.SizeUs).HasMaxLength(20);
        builder.Property(x => x.SizeEu).HasMaxLength(20);
        builder.Property(x => x.SizeUk).HasMaxLength(20);
        builder.HasOne(x => x.SizeType).WithMany(x => x.Sizes).HasForeignKey(x => x.SizeTypeId).OnDelete(DeleteBehavior.Cascade);
    }
}