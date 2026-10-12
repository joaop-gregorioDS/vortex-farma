using System.Text.Json;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using VortexFarma.Domain;
using VortexFarma.Application;
namespace VortexFarma.Infrastructure;

public sealed class FarmaService(FarmaDb db, IDistributedCache cache, ILogger<FarmaService> logger) : IFarmaService
{
    public async Task<DemoSession> CreateSession(CancellationToken ct)
    {
        var session = new DemoSession(); db.Sessions.Add(session); Seed.Populate(db, session.Id);
        await db.SaveChangesAsync(ct); return session;
    }
    public Task<DemoSession?> Session(Guid id, CancellationToken ct) => db.Sessions.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.ExpiresAt > DateTimeOffset.UtcNow, ct);
    private async Task<T> Locked<T>(Guid session, Func<Task<T>> action, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var key = BitConverter.ToInt64(session.ToByteArray());
        await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock({key})", ct);
        var result = await action(); await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return result;
    }
    private void Movement(Guid session, StockLot lot, MovementKind kind, int quantity, string reason, Guid? order = null) => db.Movements.Add(new StockMovement { SessionId = session, LotId = lot.Id, Kind = kind, Quantity = quantity, Reason = reason, OrderId = order });
    private void Event(Guid session, string type, object payload) => db.Outbox.Add(new OutboxEvent { SessionId = session, Type = type, Payload = JsonSerializer.Serialize(payload) });
    private static ProductDto Map(Product p, int available) => new(p.Id, p.Sku, p.Name, p.Brand, p.Category, p.Description, p.Presentation, p.Color, p.Shape, p.Price, p.OriginalPrice, p.RequiresReview, p.Featured, available);
    private static OrderDto Map(Order o) => new(o.Id, o.Number, o.Customer, o.StoreId, o.Fulfillment, o.Status.ToString(), o.Total, o.Shipping, o.CreatedAt, o.ReservationExpiresAt, o.ReviewNote, o.Lines.Select(l => new LineDto(l.ProductId, l.Name, l.Quantity, l.UnitPrice)).ToList());
    private IQueryable<Order> OrderQuery(Guid session) => db.Orders.Where(x => x.SessionId == session).Include(x => x.Lines).Include(x => x.Allocations).AsSplitQuery();
    public async Task<List<ProductDto>> Products(Guid session, string store, CancellationToken ct)
    {
        if (!Stores.Valid(store)) throw new RuleException("Unidade inválida.");
        // Only immutable presentation is cached; stock is always read from PostgreSQL.
        var key = $"vf:catalog:{session}"; List<Product>? products = null;
        try { var data = await cache.GetStringAsync(key, ct); if (data is not null) products = JsonSerializer.Deserialize<List<Product>>(data); } catch (Exception ex) when (ex is not OperationCanceledException) { logger.LogWarning("Cache indisponível: {Type}", ex.GetType().Name); }
        if (products is null)
        {
            products = await db.Products.AsNoTracking().Where(x => x.SessionId == session).OrderBy(x => x.Sku).ToListAsync(ct);
            try { await cache.SetStringAsync(key, JsonSerializer.Serialize(products), new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(20) }, ct); } catch (Exception ex) when (ex is not OperationCanceledException) { logger.LogWarning("Cache indisponível: {Type}", ex.GetType().Name); }
        }
        var lots = await db.Lots.AsNoTracking().Where(x => x.SessionId == session && x.StoreId == store).ToListAsync(ct);
        return products.Select(p => Map(p, lots.Where(l => l.ProductId == p.Id).Sum(l => l.Available(BusinessClock.Today)))).ToList();
    }
    public async Task<List<OrderDto>> Orders(Guid session, CancellationToken ct)
    {
        await ExpireReservations(session, ct); return (await OrderQuery(session).AsNoTracking().OrderByDescending(x => x.CreatedAt).ToListAsync(ct)).Select(Map).ToList();
    }
    public async Task<OrderDto> Checkout(Guid session, CheckoutRequest input, CancellationToken ct)
    {
        if (!Stores.Valid(input.StoreId) || input.Fulfillment is not ("pickup" or "delivery")) throw new RuleException("Selecione uma unidade e modalidade válidas.");
        if (input.Items is null || input.Items.Count is < 1 or > 24 || input.Items.Any(x => x.Quantity is < 1 or > 100) || input.Items.Select(x => x.ProductId).Distinct().Count() != input.Items.Count) throw new RuleException("Carrinho inválido.");
        if (string.IsNullOrWhiteSpace(input.Customer) || input.Customer.Length > 80 || !Guid.TryParse(input.IdempotencyKey, out _)) throw new RuleException("Informe um nome fictício e uma chave válida.");
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(input with { Items = input.Items.OrderBy(x => x.ProductId).ToList() }))));
        return await Locked(session, async () =>
        {
            await ExpireInside(session, ct);
            var existing = await OrderQuery(session).FirstOrDefaultAsync(x => x.IdempotencyKey == input.IdempotencyKey, ct);
            if (existing is not null) { if (existing.RequestHash != hash) throw new RuleException("A chave já foi usada para outro pedido."); return Map(existing); }
            var ids = input.Items.Select(x => x.ProductId).ToArray();
            var products = await db.Products.Where(x => x.SessionId == session && ids.Contains(x.Id)).ToDictionaryAsync(x => x.Id, ct);
            if (products.Count != ids.Length) throw new RuleException("Produto não encontrado nesta demonstração.");
            var order = new Order { SessionId = session, Number = $"VF-{DateTimeOffset.UtcNow:yyMMdd}-{Guid.NewGuid().ToString()[..6].ToUpperInvariant()}", Customer = input.Customer.Trim(), StoreId = input.StoreId, Fulfillment = input.Fulfillment, IdempotencyKey = input.IdempotencyKey, RequestHash = hash, ReservationExpiresAt = DateTimeOffset.UtcNow.AddMinutes(20), Status = products.Values.Any(p => p.RequiresReview) ? OrderStatus.AwaitingReview : OrderStatus.AwaitingPayment };
            foreach (var item in input.Items)
            {
                var p = products[item.ProductId]; order.Lines.Add(new OrderLine { SessionId = session, OrderId = order.Id, ProductId = p.Id, Name = p.Name, Quantity = item.Quantity, UnitPrice = p.Price });
                await Allocate(session, order, item.ProductId, item.Quantity, ct);
            }
            var subtotal = order.Lines.Sum(x => x.Quantity * x.UnitPrice); order.Shipping = input.Fulfillment == "delivery" && subtotal < 149 ? 9.90m : 0; order.Total = subtotal + order.Shipping;
            db.Orders.Add(order); Event(session, "OrderCreated", new { order.Id, order.Number, order.Total }); return Map(order);
        }, ct);
    }
    private async Task Allocate(Guid session, Order order, Guid product, int quantity, CancellationToken ct)
    {
        var lots = await db.Lots.Where(x => x.SessionId == session && x.ProductId == product && x.StoreId == order.StoreId).OrderBy(x => x.Expiry).ThenBy(x => x.Code).ToListAsync(ct);
        var remaining = quantity;
        foreach (var lot in lots) { var take = Math.Min(remaining, lot.Available(BusinessClock.Today)); if (take == 0) continue; lot.Reserve(take, BusinessClock.Today); var allocation = new Allocation { SessionId = session, OrderId = order.Id, LotId = lot.Id, Quantity = take }; order.Allocations.Add(allocation); db.Set<Allocation>().Add(allocation); Movement(session, lot, MovementKind.Reservation, take, "Reserva do pedido", order.Id); remaining -= take; if (remaining == 0) break; }
        if (remaining > 0) throw new RuleException("Estoque insuficiente. Atualize seu carrinho.");
    }
    private async Task Release(Guid session, Order order, string reason, CancellationToken ct)
    {
        foreach (var a in order.Allocations) { var lot = await db.Lots.SingleAsync(x => x.SessionId == session && x.Id == a.LotId, ct); lot.Release(a.Quantity); Movement(session, lot, MovementKind.Release, a.Quantity, reason, order.Id); }
        db.RemoveRange(order.Allocations); order.Allocations.Clear();
    }
    public async Task<OrderDto> Transition(Guid session, Guid id, OrderStatus target, CancellationToken ct) => await Locked(session, async () =>
    {
        await ExpireInside(session, ct); var o = await OrderQuery(session).SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new RuleException("Pedido não encontrado.");
        if (o.Status == target) return Map(o);
        // Transition validates before changing any inventory.
        var previous = o.Status; o.Transition(target);
        if (target == OrderStatus.Cancelled && previous is OrderStatus.AwaitingReview or OrderStatus.AwaitingPayment or OrderStatus.Paid or OrderStatus.Picking) await Release(session, o, "Pedido cancelado", ct);
        if (target is OrderStatus.Ready or OrderStatus.Shipped)
        {
            var ids = o.Allocations.Select(a => a.LotId).ToArray();
            var lots = await db.Lots.Where(x => x.SessionId == session && ids.Contains(x.Id)).ToDictionaryAsync(x => x.Id, ct);
            if (o.Allocations.Any(a => lots[a.LotId].Expiry < BusinessClock.Today || lots[a.LotId].Quarantine))
            {
                await Release(session, o, "Realocação de lote indisponível", ct);
                foreach (var l in o.Lines) await Allocate(session, o, l.ProductId, l.Quantity, ct);
                ids = o.Allocations.Select(a => a.LotId).ToArray(); lots = await db.Lots.Where(x => x.SessionId == session && ids.Contains(x.Id)).ToDictionaryAsync(x => x.Id, ct);
            }
            foreach (var a in o.Allocations) { var lot = lots[a.LotId]; lot.Sell(a.Quantity, BusinessClock.Today); Movement(session, lot, MovementKind.Sale, -a.Quantity, "Saída do pedido", o.Id); }
        }
        Event(session, "OrderStatusChanged", new { o.Id, Status = o.Status.ToString() }); return Map(o);
    }, ct);
    public async Task<OrderDto> Review(Guid session, Guid id, ReviewInput input, CancellationToken ct) => await Locked(session, async () =>
    {
        await ExpireInside(session, ct); var o = await OrderQuery(session).SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new RuleException("Pedido não encontrado.");
        if (string.IsNullOrWhiteSpace(input.Reason) || input.Reason.Length > 300) throw new RuleException("Informe o motivo da análise (até 300 caracteres).");
        o.Transition(input.Approved ? OrderStatus.AwaitingPayment : OrderStatus.Rejected); o.ReviewNote = input.Reason.Trim();
        if (!input.Approved) await Release(session, o, "Revisão rejeitada", ct);
        Event(session, "PrescriptionReviewed", new { o.Id, input.Approved }); return Map(o);
    }, ct);
    private async Task ExpireInside(Guid session, CancellationToken ct)
    {
        var orders = await OrderQuery(session).Where(x => x.ReservationExpiresAt < DateTimeOffset.UtcNow && (x.Status == OrderStatus.AwaitingReview || x.Status == OrderStatus.AwaitingPayment || x.Status == OrderStatus.Paid || x.Status == OrderStatus.Picking)).ToListAsync(ct);
        foreach (var o in orders) { o.Transition(OrderStatus.Expired); await Release(session, o, "Reserva expirada", ct); Event(session, "ReservationExpired", new { o.Id }); }
    }
    public async Task ExpireReservations(Guid session, CancellationToken ct) => await Locked(session, async () => { await ExpireInside(session, ct); return true; }, ct);
    public async Task<List<LotDto>> Lots(Guid session, CancellationToken ct)
    {
        var products = await db.Products.AsNoTracking().Where(x => x.SessionId == session).ToDictionaryAsync(x => x.Id, ct);
        return (await db.Lots.AsNoTracking().Where(x => x.SessionId == session).OrderBy(x => x.Expiry).ToListAsync(ct)).Select(l => new LotDto(l.Id, l.ProductId, products[l.ProductId].Name, products[l.ProductId].Sku, products[l.ProductId].Category, l.StoreId, l.Code, l.Expiry, l.OnHand, l.Reserved, l.Available(BusinessClock.Today), l.Quarantine, l.Quarantine ? "Quarantine" : l.Expiry < BusinessClock.Today ? "Expired" : l.Expiry <= BusinessClock.Today.AddDays(30) ? "Expiring" : l.Available(BusinessClock.Today) < 5 ? "Low" : "Healthy")).ToList();
    }
    public async Task Adjust(Guid session, Guid id, AdjustInput input, CancellationToken ct) => await Locked(session, async () =>
    {
        if (string.IsNullOrWhiteSpace(input.Reason) || input.Reason.Length > 300 || Math.Abs((long)input.Quantity) > 10000) throw new RuleException("Informe uma quantidade válida e justificativa.");
        var lot = await db.Lots.SingleOrDefaultAsync(x => x.SessionId == session && x.Id == id, ct) ?? throw new RuleException("Lote não encontrado.");
        lot.Adjust(input.Quantity); Movement(session, lot, MovementKind.Adjustment, input.Quantity, input.Reason.Trim()); Event(session, "StockAdjusted", new { lot.Id, input.Quantity }); return true;
    }, ct);
    public async Task Receive(Guid session, ReceiveInput input, CancellationToken ct) => await Locked(session, async () =>
    {
        if (!Stores.Valid(input.StoreId) || input.Quantity is < 1 or > 10000 || input.Expiry < BusinessClock.Today || string.IsNullOrWhiteSpace(input.Code) || input.Code.Length > 40) throw new RuleException("Informe unidade, lote, validade e quantidade válidos.");
        if (!await db.Products.AnyAsync(x => x.SessionId == session && x.Id == input.ProductId, ct)) throw new RuleException("Produto não encontrado.");
        var code = input.Code.Trim();
        if (await db.Lots.AnyAsync(x => x.SessionId == session && x.ProductId == input.ProductId && x.StoreId == input.StoreId && x.Code == code, ct)) throw new RuleException("Este lote já existe. Utilize o ajuste justificado.");
        var lot = new StockLot { SessionId = session, ProductId = input.ProductId, StoreId = input.StoreId, Code = input.Code.Trim(), Expiry = input.Expiry, OnHand = input.Quantity }; db.Lots.Add(lot); Movement(session, lot, MovementKind.Receipt, input.Quantity, "Recebimento de mercadoria"); Event(session, "StockReceived", new { lot.Id, input.Quantity }); return true;
    }, ct);
    public async Task<ProductDto> SaveProduct(Guid session, Guid? id, ProductInput input, CancellationToken ct)
    {
        var result = await Locked(session, async () =>
        {
            if (string.IsNullOrWhiteSpace(input.Name) || input.Name.Length > 100 || input.Price <= 0 || input.Price > 100000 || decimal.Round(input.Price,2)!=input.Price || string.IsNullOrWhiteSpace(input.Brand) || input.Brand.Length > 60 || input.Description is null || input.Description.Length > 1000 || input.Presentation is null || input.Presentation.Length > 100 || !new[] { "Medicamentos", "Dermocosméticos", "Vitaminas", "Higiene", "Beleza", "Infantil" }.Contains(input.Category)) throw new RuleException("Dados de produto inválidos.");
            var p = id.HasValue ? await db.Products.SingleOrDefaultAsync(x => x.SessionId == session && x.Id == id, ct) ?? throw new RuleException("Produto não encontrado.") : new Product { SessionId = session, Sku = $"VF-{Guid.NewGuid().ToString()[..8].ToUpperInvariant()}" };
            p.Name = input.Name.Trim(); p.Brand = input.Brand.Trim(); p.Category = input.Category; p.Presentation = input.Presentation.Trim(); p.Description = input.Description.Trim(); p.Price = input.Price; p.RequiresReview = input.RequiresReview;
            if (!id.HasValue) { p.OriginalPrice = input.Price; db.Products.Add(p); }
            Event(session, "ProductSaved", new { p.Id }); return Map(p, 0);
        }, ct);
        try { await cache.RemoveAsync($"vf:catalog:{session}", ct); } catch (Exception ex) when (ex is not OperationCanceledException) { logger.LogWarning("Cache indisponível: {Type}", ex.GetType().Name); }
        return result;
    }
    public async Task<DashboardDto> Dashboard(Guid session, CancellationToken ct)
    {
        var orders = await Orders(session, ct); var lots = await Lots(session, ct);
        var movements = await (from m in db.Movements.AsNoTracking() join l in db.Lots on new { m.SessionId, Id = m.LotId } equals new { l.SessionId, l.Id } join p in db.Products on new { l.SessionId, Id = l.ProductId } equals new { p.SessionId, p.Id } where m.SessionId == session orderby m.CreatedAt descending select new MovementDto(m.Id, p.Name, l.Code, m.Kind.ToString(), m.Quantity, m.Reason, m.Actor, m.CreatedAt)).Take(12).ToListAsync(ct);
        return new(orders.Count, orders.Where(o => o.Status is "Paid" or "Picking" or "Ready" or "Shipped" or "Completed").Sum(o => o.Total), lots.Sum(l => l.Available), lots.GroupBy(l => new { l.ProductId, l.StoreId }).Count(g => g.Sum(l => l.Available) < 5), lots.Count(l => l.Status == "Expiring"), orders.Count(o => o.Status == "AwaitingReview"), await db.Outbox.CountAsync(x => x.SessionId == session && x.PublishedAt != null, ct), await db.Inbox.CountAsync(x => x.SessionId == session, ct), orders.Take(5).ToList(), movements);
    }
}
