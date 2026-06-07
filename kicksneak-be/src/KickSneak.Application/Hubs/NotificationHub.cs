using Microsoft.AspNetCore.SignalR;

namespace KickSneak.Application.Hubs;

public sealed class NotificationHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var uid = Context.User?.FindFirst("uid")?.Value;

        if (uid is not null)
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{uid}");

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var uid = Context.User?.FindFirst("uid")?.Value;

        if (uid is not null)
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user:{uid}");

        await base.OnDisconnectedAsync(exception);
    }
}
