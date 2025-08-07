using IntelliInspect.Api.Services;
using IntelliInspect.Api.Hubs;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Add HTTP client for ML service communication
builder.Services.AddHttpClient<IMLService, MLService>();

// Register custom services
builder.Services.AddSingleton<IDatasetService, DatasetService>();

// Add SignalR for real-time communication
builder.Services.AddSignalR();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Enable CORS
app.UseCors("AllowFrontend");

// Disable HTTPS redirection for Docker containers
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseRouting();
app.MapControllers();

// Map SignalR hub
app.MapHub<SimulationHub>("/simulationHub");

app.Run();
