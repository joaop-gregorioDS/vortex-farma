using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using VortexFarma.Application;
namespace VortexFarma.Infrastructure;

public static class Registration
{
    public static IServiceCollection AddFarma(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<FarmaDb>(o => o.UseNpgsql(configuration.GetConnectionString("Postgres") ?? "Host=localhost;Port=55432;Database=vortex_farma;Username=vortex;Password=vortex_local_only", n => n.SetPostgresVersion(16, 0)));
        services.AddStackExchangeRedisCache(o => o.Configuration = configuration.GetConnectionString("Redis") ?? "127.0.0.1:56379,abortConnect=false,connectTimeout=2000,syncTimeout=2000");
        services.AddScoped<IFarmaService, FarmaService>(); return services;
    }
}
