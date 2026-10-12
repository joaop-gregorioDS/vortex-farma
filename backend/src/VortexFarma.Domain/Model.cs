namespace VortexFarma.Domain;

public sealed class RuleException(string message) : Exception(message);
public enum OrderStatus { AwaitingReview, AwaitingPayment, Paid, Picking, Ready, Shipped, Completed, Cancelled, Expired, Rejected }
public enum MovementKind { Receipt, Reservation, Release, Sale, Adjustment, Disposal }
public sealed class DemoSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string CsrfToken { get; set; } = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ExpiresAt { get; set; } = DateTimeOffset.UtcNow.AddDays(1);
}
public sealed class Product
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SessionId { get; set; }
    public string Sku { get; set; } = "";
    public string Name { get; set; } = "";
    public string Brand { get; set; } = "Vortex Care";
    public string Category { get; set; } = "";
    public string Description { get; set; } = "";
    public string Presentation { get; set; } = "";
    public string Color { get; set; } = "#cc0033";
    public string Shape { get; set; } = "bottle";
    public decimal Price { get; set; }
    public decimal OriginalPrice { get; set; }
    public bool RequiresReview { get; set; }
    public bool Featured { get; set; }
}
public sealed class StockLot
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SessionId { get; set; }
    public Guid ProductId { get; set; }
    public string StoreId { get; set; } = "centro";
    public string Code { get; set; } = "";
    public DateOnly Expiry { get; set; }
    public int OnHand { get; set; }
    public int Reserved { get; set; }
    public bool Quarantine { get; set; }
    public int Available(DateOnly today) => Quarantine || Expiry < today ? 0 : Math.Max(0, OnHand - Reserved);
    public void Reserve(int quantity, DateOnly today)
    {
        if (quantity <= 0 || Available(today) < quantity) throw new RuleException("Estoque insuficiente ou lote indisponível.");
        Reserved += quantity;
    }
    public void Release(int quantity)
    {
        if (quantity <= 0 || quantity > Reserved) throw new RuleException("Reserva inválida.");
        Reserved -= quantity;
    }
    public void Sell(int quantity, DateOnly today)
    {
        if (Expiry < today || Quarantine) throw new RuleException("O lote está vencido ou em quarentena.");
        if (quantity <= 0 || Reserved < quantity || OnHand < quantity) throw new RuleException("Reserva inválida para expedição.");
        Reserved -= quantity; OnHand -= quantity;
    }
    public void Adjust(int delta)
    {
        if (delta == 0 || OnHand + delta < Reserved || OnHand + delta < 0) throw new RuleException("O ajuste não pode comprometer o saldo reservado.");
        OnHand += delta;
    }
}
public sealed class Order
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SessionId { get; set; }
    public string Number { get; set; } = "";
    public string Customer { get; set; } = "Cliente demonstração";
    public string StoreId { get; set; } = "centro";
    public string Fulfillment { get; set; } = "pickup";
    public OrderStatus Status { get; set; }
    public decimal Total { get; set; }
    public decimal Shipping { get; set; }
    public string IdempotencyKey { get; set; } = "";
    public string RequestHash { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ReservationExpiresAt { get; set; }
    public string ReviewNote { get; set; } = "";
    public List<OrderLine> Lines { get; set; } = [];
    public List<Allocation> Allocations { get; set; } = [];
    public bool HasReservation => Status is OrderStatus.AwaitingReview or OrderStatus.AwaitingPayment or OrderStatus.Paid or OrderStatus.Picking;
    public void Transition(OrderStatus target)
    {
        var valid = (Status, target) switch
        {
            (OrderStatus.AwaitingReview, OrderStatus.AwaitingPayment or OrderStatus.Rejected or OrderStatus.Cancelled or OrderStatus.Expired) => true,
            (OrderStatus.AwaitingPayment, OrderStatus.Paid or OrderStatus.Cancelled or OrderStatus.Expired) => true,
            (OrderStatus.Paid, OrderStatus.Picking or OrderStatus.Cancelled or OrderStatus.Expired) => true,
            (OrderStatus.Picking, OrderStatus.Ready or OrderStatus.Shipped or OrderStatus.Cancelled or OrderStatus.Expired) => true,
            (OrderStatus.Ready or OrderStatus.Shipped, OrderStatus.Completed) => true,
            _ => false
        };
        if (!valid) throw new RuleException("Essa transição não é permitida para o pedido.");
        if (target == OrderStatus.Ready && Fulfillment != "pickup" || target == OrderStatus.Shipped && Fulfillment != "delivery") throw new RuleException("Modalidade de recebimento incompatível.");
        Status = target;
    }
}
public sealed class OrderLine
{
    public Guid Id { get; set; } = Guid.NewGuid(); public Guid OrderId { get; set; }
    public Guid SessionId { get; set; }
    public Guid ProductId { get; set; }
    public string Name { get; set; } = ""; public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}
public sealed class Allocation
{
    public Guid Id { get; set; } = Guid.NewGuid(); public Guid OrderId { get; set; }
    public Guid SessionId { get; set; }
    public Guid LotId { get; set; }
    public int Quantity { get; set; }
}
public sealed class StockMovement
{
    public Guid Id { get; set; } = Guid.NewGuid(); public Guid SessionId { get; set; }
    public Guid LotId { get; set; }
    public Guid? OrderId { get; set; }
    public MovementKind Kind { get; set; }
    public int Quantity { get; set; }
    public string Reason { get; set; } = ""; public string Actor { get; set; } = "Administrador demo";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
public sealed class OutboxEvent
{
    public Guid Id { get; set; } = Guid.NewGuid(); public Guid SessionId { get; set; }
    public string Type { get; set; } = ""; public string Payload { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow; public DateTimeOffset? PublishedAt { get; set; }
}
public sealed class ProcessedEvent
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public string Type { get; set; } = "";
    public DateTimeOffset ProcessedAt { get; set; } = DateTimeOffset.UtcNow;
}
