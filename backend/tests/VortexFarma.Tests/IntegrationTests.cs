using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using VortexFarma.Domain;
using VortexFarma.Application;
using VortexFarma.Infrastructure;
namespace VortexFarma.Tests;

public sealed class PostgresFixture : IAsyncLifetime
{
    public string Connection { get; } = Environment.GetEnvironmentVariable("VF_TEST_POSTGRES") ?? "Host=localhost;Port=55432;Database=vortex_farma_tests;Username=vortex;Password=vortex_local_only";
    public async Task InitializeAsync()
    {
        var builder = new NpgsqlConnectionStringBuilder(Connection); var name = builder.Database!; builder.Database = "postgres";
        await using var c = new NpgsqlConnection(builder.ConnectionString); await c.OpenAsync();
        await using var exists = new NpgsqlCommand("SELECT count(*) FROM pg_database WHERE datname=@name", c); exists.Parameters.AddWithValue("name", name);
        if (Convert.ToInt32(await exists.ExecuteScalarAsync()) == 0) { await using var create = new NpgsqlCommand("CREATE DATABASE " + new NpgsqlCommandBuilder().QuoteIdentifier(name), c); await create.ExecuteNonQueryAsync(); }
        await using var db = Db(); await db.Database.MigrateAsync();
    }
    public FarmaDb Db() => new(new DbContextOptionsBuilder<FarmaDb>().UseNpgsql(Connection, o => o.SetPostgresVersion(16, 0)).Options);
    public FarmaService Service(FarmaDb db) => new(db, new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions())), NullLogger<FarmaService>.Instance);
    public async Task<Guid> Session() { await using var db = Db(); return (await Service(db).CreateSession(default)).Id; }
    public async Task<T> Run<T>(Func<FarmaService, Task<T>> action) { await using var db = Db(); return await action(Service(db)); }
    public Task DisposeAsync() => Task.CompletedTask;
}
public class IntegrationTests(PostgresFixture fixture) : IClassFixture<PostgresFixture>
{
    [Fact]
    public async Task All_seeded_physical_stock_has_a_receipt_in_the_ledger()
    {
        var s=await fixture.Session();await using var db=fixture.Db();
        var lots=await db.Lots.Where(x=>x.SessionId==s).ToListAsync();
        var receipts=await db.Movements.Where(x=>x.SessionId==s&&x.Kind==MovementKind.Receipt).ToListAsync();
        Assert.All(lots,lot=>Assert.Equal(lot.OnHand,receipts.Where(x=>x.LotId==lot.Id).Sum(x=>x.Quantity)));
    }
    private static CheckoutRequest Request(ProductDto p, int quantity = 1) => new("centro", "pickup", "Cliente teste", Guid.NewGuid().ToString(), [new(p.Id, quantity)]);
    [Fact]
    public async Task Last_unit_can_only_be_reserved_once_under_concurrency()
    {
        var s = await fixture.Session(); await using (var db = fixture.Db()) { var p = await db.Products.SingleAsync(x => x.SessionId == s && x.Sku == "VF-019"); var lot = await db.Lots.SingleAsync(x => x.SessionId == s && x.ProductId == p.Id && x.StoreId == "centro"); lot.OnHand = 1; await db.SaveChangesAsync(); }
        var product = (await fixture.Run(x => x.Products(s, "centro", default))).Single(x => x.Sku == "VF-019");
        async Task<bool> Buy() { try { await fixture.Run(x => x.Checkout(s, Request(product), default)); return true; } catch (RuleException) { return false; } }
        var results = await Task.WhenAll(Buy(), Buy()); Assert.Single(results, x => x);
        await using var check = fixture.Db(); var lotCheck = await check.Lots.SingleAsync(x => x.SessionId == s && x.ProductId == product.Id && x.StoreId == "centro"); Assert.Equal(1, lotCheck.Reserved); Assert.Equal(1, lotCheck.OnHand);
    }
    [Fact]
    public async Task Checkout_is_idempotent_and_key_reuse_for_other_payload_is_rejected()
    {
        var s = await fixture.Session(); var p = (await fixture.Run(x => x.Products(s, "centro", default)))[0]; var request = Request(p, 2);
        var first = await fixture.Run(x => x.Checkout(s, request, default)); var second = await fixture.Run(x => x.Checkout(s, request, default)); Assert.Equal(first.Id, second.Id);
        await Assert.ThrowsAsync<RuleException>(() => fixture.Run(x => x.Checkout(s, request with { Customer = "Outro cliente" }, default)));
        await using var db = fixture.Db(); Assert.Equal(2, await db.Lots.Where(x => x.SessionId == s && x.ProductId == p.Id && x.StoreId == "centro").SumAsync(x => x.Reserved)); Assert.Single(await db.Orders.Where(x => x.SessionId == s).ToListAsync());
    }
    [Fact]
    public async Task Failed_multiline_checkout_rolls_back_every_reservation_and_outbox_event()
    {
        var s = await fixture.Session(); var products = await fixture.Run(x => x.Products(s, "centro", default)); var good = products[0]; var unavailable = products.Single(p => p.Sku == "VF-023"); var input = Request(good) with { Items = [new(good.Id, 2), new(unavailable.Id, 1)] };
        await Assert.ThrowsAsync<RuleException>(() => fixture.Run(x => x.Checkout(s, input, default)));
        await using var db = fixture.Db(); Assert.Equal(0, await db.Lots.Where(x => x.SessionId == s).SumAsync(x => x.Reserved)); Assert.False(await db.Outbox.AnyAsync(x => x.SessionId == s));
    }
    [Fact]
    public async Task Cancellation_and_expiration_release_stock_exactly_once()
    {
        var s = await fixture.Session(); var p = (await fixture.Run(x => x.Products(s, "centro", default)))[1]; var order = await fixture.Run(x => x.Checkout(s, Request(p, 3), default));
        await fixture.Run(x => x.Transition(s, order.Id, OrderStatus.Cancelled, default)); await fixture.Run(x => x.Transition(s, order.Id, OrderStatus.Cancelled, default));
        var expiring = await fixture.Run(x => x.Checkout(s, Request(p, 2), default)); await using (var db = fixture.Db()) { var o = await db.Orders.SingleAsync(x => x.Id == expiring.Id); o.ReservationExpiresAt = DateTimeOffset.UtcNow.AddMinutes(-1); await db.SaveChangesAsync(); }
        var orders = await fixture.Run(x => x.Orders(s, default)); await fixture.Run(x => x.Orders(s, default)); Assert.Equal("Expired", orders.Single(x => x.Id == expiring.Id).Status);
        await using var check = fixture.Db(); Assert.Equal(0, await check.Lots.Where(x => x.SessionId == s).SumAsync(x => x.Reserved)); Assert.Equal(5, await check.Movements.Where(x => x.SessionId == s && x.Kind == MovementKind.Release).SumAsync(x => x.Quantity));
    }
    [Fact]
    public async Task Fefo_review_and_fulfillment_preserve_lot_traceability()
    {
        var s = await fixture.Session(); var p = (await fixture.Run(x => x.Products(s, "centro", default))).Single(x => x.Sku == "VF-008"); var order = await fixture.Run(x => x.Checkout(s, Request(p, 2), default)); Assert.Equal("AwaitingReview", order.Status);
        await Assert.ThrowsAsync<RuleException>(() => fixture.Run(x => x.Transition(s, order.Id, OrderStatus.Paid, default)));
        await fixture.Run(x => x.Review(s, order.Id, new(true, "Conferência fictícia"), default));
        await fixture.Run(x => x.Transition(s, order.Id, OrderStatus.Paid, default)); await fixture.Run(x => x.Transition(s, order.Id, OrderStatus.Picking, default)); await fixture.Run(x => x.Transition(s, order.Id, OrderStatus.Ready, default));
        await using var db = fixture.Db(); var sale = await db.Movements.SingleAsync(x => x.SessionId == s && x.OrderId == order.Id && x.Kind == MovementKind.Sale); var lot = await db.Lots.SingleAsync(x => x.Id == sale.LotId); Assert.EndsWith("-B", lot.Code); Assert.Equal(3, lot.OnHand); Assert.Equal(0, lot.Reserved);
        Assert.True(await db.Set<Allocation>().AnyAsync(x => x.OrderId == order.Id));
    }
    [Fact]
    public async Task Separate_sessions_cannot_read_or_mutate_other_orders_lots_or_products()
    {
        var a = await fixture.Session(); var b = await fixture.Session(); var p = (await fixture.Run(x => x.Products(a, "centro", default)))[0]; var order = await fixture.Run(x => x.Checkout(a, Request(p), default));
        Assert.Empty(await fixture.Run(x => x.Orders(b, default)));
        await Assert.ThrowsAsync<RuleException>(() => fixture.Run(x => x.Transition(b, order.Id, OrderStatus.Cancelled, default)));
        await Assert.ThrowsAsync<RuleException>(() => fixture.Run(x => x.Checkout(b, Request(p), default)));
        var lot = (await fixture.Run(x => x.Lots(a, default)))[0]; await using var db = fixture.Db(); await Assert.ThrowsAsync<RuleException>(() => fixture.Service(db).Adjust(b, lot.Id, new(1, "Teste"), default));
    }
    [Fact]
    public async Task Rejected_review_releases_the_reservation()
    {
        var s = await fixture.Session(); var p = (await fixture.Run(x => x.Products(s, "centro", default))).First(x => x.RequiresReview); var order = await fixture.Run(x => x.Checkout(s, Request(p), default));
        var rejected = await fixture.Run(x => x.Review(s, order.Id, new(false, "Documento fictício rejeitado"), default)); Assert.Equal("Rejected", rejected.Status);
        await using var db = fixture.Db(); Assert.Equal(0, await db.Lots.Where(x => x.SessionId == s).SumAsync(x => x.Reserved));
    }
    [Fact]
    public async Task Fulfillment_reallocates_a_lot_that_expired_after_reservation()
    {
        var s = await fixture.Session(); var p = (await fixture.Run(x => x.Products(s, "centro", default)))[0]; var o = await fixture.Run(x => x.Checkout(s, Request(p), default));
        await fixture.Run(x => x.Transition(s, o.Id, OrderStatus.Paid, default)); await fixture.Run(x => x.Transition(s, o.Id, OrderStatus.Picking, default));
        await using (var db = fixture.Db()) { var allocation = await db.Set<Allocation>().SingleAsync(x => x.OrderId == o.Id); var lot = await db.Lots.SingleAsync(x => x.Id == allocation.LotId); lot.Expiry = BusinessClock.Today.AddDays(-1); await db.SaveChangesAsync(); }
        await fixture.Run(x => x.Transition(s, o.Id, OrderStatus.Ready, default)); await using var check = fixture.Db(); var sale = await check.Movements.SingleAsync(x => x.OrderId == o.Id && x.Kind == MovementKind.Sale); Assert.EndsWith("-A", (await check.Lots.SingleAsync(x => x.Id == sale.LotId)).Code);
    }
}
