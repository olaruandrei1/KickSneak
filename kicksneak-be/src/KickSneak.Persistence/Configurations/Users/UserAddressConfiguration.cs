using KickSneak.Domain.Entities.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KickSneak.Persistence.Configurations.Users;

public class UserAddressConfiguration : IEntityTypeConfiguration<UserAddress>
{
    public void Configure(EntityTypeBuilder<UserAddress> builder)
    {
        builder.ToTable("user_addresses");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.AddressName).HasMaxLength(255);
        builder.Property(x => x.FirstName).HasMaxLength(100);
        builder.Property(x => x.LastName).HasMaxLength(100);
        builder.Property(x => x.Country).HasMaxLength(100);
        builder.Property(x => x.City).HasMaxLength(100);
        builder.Property(x => x.County).HasMaxLength(100);
        builder.Property(x => x.Street).HasMaxLength(255);
        builder.Property(x => x.StreetNumber).HasMaxLength(20);
        builder.Property(x => x.Building).HasMaxLength(50);
        builder.Property(x => x.Stairwell).HasMaxLength(50);
        builder.Property(x => x.Floor).HasMaxLength(20);
        builder.Property(x => x.Apartment).HasMaxLength(20);
        builder.Property(x => x.AccessCode).HasMaxLength(50);
        builder.Property(x => x.PostalCode).HasMaxLength(20);
        builder.Property(x => x.Phone).HasMaxLength(50);
        builder.HasOne(x => x.User).WithMany(x => x.Addresses).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}