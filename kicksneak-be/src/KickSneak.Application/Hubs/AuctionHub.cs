using Microsoft.AspNetCore.SignalR;

namespace KickSneak.Application.Hubs;

public sealed class AuctionHub : Hub
{
    public async Task JoinAuction(string auctionId)
    => await Groups.AddToGroupAsync(Context.ConnectionId, $"auction:{auctionId}");

    public async Task LeaveAuction(string auctionId)
    => await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"auction:{auctionId}");

    public override async Task OnConnectedAsync()
    {
        var uid = Context.User?.FindFirst("uid")?.Value;

        if (uid is not null)
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{uid}");

        await base.OnConnectedAsync();
    }

    public async Task JoinAuctionsList()
    => await Groups.AddToGroupAsync(Context.ConnectionId, "auctions:list");

    public async Task LeaveAuctionsList()
    => await Groups.RemoveFromGroupAsync(Context.ConnectionId, "auctions:list");
}
