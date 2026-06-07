using KickSneak.Domain.Entities.Auctions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KickSneak.Persistence.Configurations.Auctions;

public class AutoBidConfiguration : IEntityTypeConfiguration<AutoBid>
{
    public void Configure(EntityTypeBuilder<AutoBid> builder)
    {
        builder.ToTable("auto_bids");
        builder.HasKey(x => x.Id);
        builder.HasOne(x => x.Auction).WithMany(x => x.AutoBids).HasForeignKey(x => x.AuctionId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}