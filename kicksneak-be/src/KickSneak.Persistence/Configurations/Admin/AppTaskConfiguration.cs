using KickSneak.Domain.Entities.Admin;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KickSneak.Persistence.Configurations.Admin;

public class AppTaskConfiguration : IEntityTypeConfiguration<AppTask>
{
    public void Configure(EntityTypeBuilder<AppTask> builder)
    {
        builder.ToTable("tasks");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Title).HasMaxLength(255);
        builder.HasOne(x => x.AssignedUser).WithMany().HasForeignKey(x => x.AssignedTo).OnDelete(DeleteBehavior.SetNull);
        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}