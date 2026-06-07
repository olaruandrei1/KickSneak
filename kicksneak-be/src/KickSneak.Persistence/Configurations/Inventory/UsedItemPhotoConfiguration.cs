using KickSneak.Domain.Entities.Inventory;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KickSneak.Persistence.Configurations.Inventory;

public class UsedItemPhotoConfiguration : IEntityTypeConfiguration<UsedItemPhoto>
{
    public void Configure(EntityTypeBuilder<UsedItemPhoto> builder)
    {
        builder.ToTable("used_item_photos");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.PhotoUrl).HasMaxLength(500);
        builder.HasOne(x => x.UsedItem).WithMany(x => x.Photos).HasForeignKey(x => x.UsedItemId).OnDelete(DeleteBehavior.Cascade);
        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}