using VortexFarma.Worker;
using VortexFarma.Infrastructure;

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddFarma(builder.Configuration);
builder.Services.AddHostedService<DemoWorker>();

var host = builder.Build();
host.Run();
