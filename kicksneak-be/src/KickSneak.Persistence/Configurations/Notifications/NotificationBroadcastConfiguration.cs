using KickSneak.Domain.Entities.Notifications;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KickSneak.Persistence.Configurations.Notifications;

public class NotificationBroadcastConfiguration : IEntityTypeConfiguration<NotificationBroadcast>
{
    public void Configure(EntityTypeBuilder<NotificationBroadcast> builder)
    {
        builder.ToTable("notification_broadcasts");
        builder.HasKey(x => x.Id);
    }
}
