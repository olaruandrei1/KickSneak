using KickSneak.Domain.Entities.Auctions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KickSneak.Persistence.Configurations.Auctions;

public class BidConfiguration : IEntityTypeConfiguration<Bid>
{
    public void Configure(EntityTypeBuilder<Bid> builder)
    {
        builder.ToTable("bids");
        builder.HasKey(x => x.Id);
        builder.HasOne(x => x.Auction).WithMany(x => x.Bids).HasForeignKey(x => x.AuctionId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.Bidder).WithMany().HasForeignKey(x => x.BidderId).OnDelete(DeleteBehavior.Restrict);
        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}