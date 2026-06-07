using KickSneak.Domain.Entities.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KickSneak.Persistence.Configurations.Users;

public class UserContactConfiguration : IEntityTypeConfiguration<UserContact>
{
    public void Configure(EntityTypeBuilder<UserContact> builder)
    {
        builder.ToTable("user_contacts");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Phone).HasMaxLength(50);
        builder.Property(x => x.EmailAddress).HasMaxLength(255);
        builder.HasOne(x => x.User).WithMany(x => x.Contacts).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}