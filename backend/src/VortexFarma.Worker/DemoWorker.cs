using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using VortexFarma.Infrastructure;
using VortexFarma.Application;
using VortexFarma.Domain;
namespace VortexFarma.Worker;

public sealed class DemoWorker(IServiceScopeFactory scopes, IConfiguration configuration, ILogger<DemoWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var factory = new ConnectionFactory { HostName = configuration["RabbitMQ:Host"] ?? "localhost", Port = int.Parse(configuration["RabbitMQ:Port"] ?? "55672"), UserName = configuration["RabbitMQ:User"] ?? "vortex", Password = configuration["RabbitMQ:Password"] ?? "vortex_local_only", AutomaticRecoveryEnabled = true };
                await using var connection = await factory.CreateConnectionAsync(stoppingToken);
                await using var publisher = await connection.CreateChannelAsync(new CreateChannelOptions(true, true), stoppingToken);
                await publisher.ExchangeDeclareAsync("vf.dead", ExchangeType.Direct, true, cancellationToken: stoppingToken);
                await publisher.QueueDeclareAsync("vf.failed", true, false, false, cancellationToken: stoppingToken);
                await publisher.QueueBindAsync("vf.failed", "vf.dead", "failed", cancellationToken: stoppingToken);
                await publisher.QueueDeclareAsync("vf.operations", true, false, false, new Dictionary<string, object?> { ["x-dead-letter-exchange"] = "vf.dead", ["x-dead-letter-routing-key"] = "failed" }, cancellationToken: stoppingToken);
                await using var consumerChannel = await connection.CreateChannelAsync(cancellationToken: stoppingToken);
                await consumerChannel.BasicQosAsync(0, 10, false, stoppingToken);
                var consumer = new AsyncEventingBasicConsumer(consumerChannel);
                consumer.ReceivedAsync += async (_, ea) =>
                {
                    try
                    {
                        var message = JsonSerializer.Deserialize<OutboxEvent>(ea.Body.Span) ?? throw new InvalidDataException("Evento inválido");
                        using var scope = scopes.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<FarmaDb>();
                        if (await db.Sessions.AnyAsync(s => s.Id == message.SessionId, stoppingToken) && !await db.Inbox.AnyAsync(e => e.Id == message.Id, stoppingToken))
                        {
                            db.Inbox.Add(new ProcessedEvent { Id = message.Id, SessionId = message.SessionId, Type = message.Type });
                            try { await db.SaveChangesAsync(stoppingToken); } catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException { SqlState: "23505" }) { }
                        }
                        await consumerChannel.BasicAckAsync(ea.DeliveryTag, false, stoppingToken);
                    }
                    catch (Exception ex) when (ex is not OperationCanceledException)
                    {
                        logger.LogError(ex, "Falha ao consumir evento. Encaminhado para vf.failed");
                        await consumerChannel.BasicNackAsync(ea.DeliveryTag, false, false, stoppingToken);
                    }
                };
                await consumerChannel.BasicConsumeAsync("vf.operations", false, consumer, stoppingToken);
                logger.LogInformation("Worker conectado. Outbox e consumidor ativos.");
                while (!stoppingToken.IsCancellationRequested && connection.IsOpen)
                {
                    await Housekeeping(stoppingToken);
                    using var scope = scopes.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<FarmaDb>();
                    await using var tx = await db.Database.BeginTransactionAsync(stoppingToken);
                    await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(78213001)", stoppingToken);
                    var events = await db.Outbox.Where(x => x.PublishedAt == null).OrderBy(x => x.CreatedAt).Take(100).ToListAsync(stoppingToken);
                    foreach (var e in events)
                    {
                        await publisher.BasicPublishAsync("", "vf.operations", true, new BasicProperties { Persistent = true, MessageId = e.Id.ToString(), ContentType = "application/json" }, JsonSerializer.SerializeToUtf8Bytes(e), stoppingToken);
                        e.PublishedAt = DateTimeOffset.UtcNow;
                    }
                    await db.SaveChangesAsync(stoppingToken); await tx.CommitAsync(stoppingToken);
                    await Task.Delay(TimeSpan.FromSeconds(3), stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex) { logger.LogWarning(ex, "Worker indisponível; nova tentativa em 5 segundos"); await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken); }
        }
    }
    private async Task Housekeeping(CancellationToken ct)
    {
        using var scope = scopes.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<FarmaDb>(); var service = scope.ServiceProvider.GetRequiredService<IFarmaService>();
        var sessions = await db.Sessions.AsNoTracking().ToListAsync(ct);
        foreach (var s in sessions)
        {
            if (s.ExpiresAt > DateTimeOffset.UtcNow) { await service.ExpireReservations(s.Id, ct); continue; }
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            var key = BitConverter.ToInt64(s.Id.ToByteArray()); await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock({key})", ct);
            await db.Orders.Where(x => x.SessionId == s.Id).ExecuteDeleteAsync(ct);
            await db.Products.Where(x => x.SessionId == s.Id).ExecuteDeleteAsync(ct);
            await db.Sessions.Where(x => x.Id == s.Id).ExecuteDeleteAsync(ct); await tx.CommitAsync(ct);
        }
    }
}
