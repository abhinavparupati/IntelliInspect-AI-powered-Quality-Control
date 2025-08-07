using Microsoft.AspNetCore.SignalR;

namespace IntelliInspect.Api.Hubs
{
    public class SimulationHub : Hub
    {
        private readonly ILogger<SimulationHub> _logger;
        private static readonly HashSet<string> _connectedClients = new HashSet<string>();
        private static readonly object _clientsLock = new object();

        public SimulationHub(ILogger<SimulationHub> logger)
        {
            _logger = logger;
        }

        public async Task JoinSimulationGroup()
        {
            _logger.LogInformation("Client {ConnectionId} joining SimulationGroup", Context.ConnectionId);
            await Groups.AddToGroupAsync(Context.ConnectionId, "SimulationGroup");
            
            lock (_clientsLock)
            {
                _connectedClients.Add(Context.ConnectionId);
                _logger.LogInformation("Connected clients count: {Count}", _connectedClients.Count);
            }
        }

        public async Task LeaveSimulationGroup()
        {
            _logger.LogInformation("Client {ConnectionId} leaving SimulationGroup", Context.ConnectionId);
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, "SimulationGroup");
            
            lock (_clientsLock)
            {
                _connectedClients.Remove(Context.ConnectionId);
                _logger.LogInformation("Connected clients count: {Count}", _connectedClients.Count);
            }
        }

        public static int GetConnectedClientsCount()
        {
            lock (_clientsLock)
            {
                return _connectedClients.Count;
            }
        }

        public override async Task OnConnectedAsync()
        {
            _logger.LogInformation("SignalR client connected: {ConnectionId}", Context.ConnectionId);
            await JoinSimulationGroup();
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            _logger.LogInformation("SignalR client disconnected: {ConnectionId}, Exception: {Exception}", 
                Context.ConnectionId, exception?.Message);
            await LeaveSimulationGroup();
            await base.OnDisconnectedAsync(exception);
        }
    }
}