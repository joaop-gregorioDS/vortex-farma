using VortexFarma.Domain;
namespace VortexFarma.Application;

public record StoreDto(string Id, string Name, string Address, string Hours);
public record ProductDto(Guid Id, string Sku, string Name, string Brand, string Category, string Description, string Presentation, string Color, string Shape, decimal Price, decimal OriginalPrice, bool RequiresReview, bool Featured, int Available);
public record CartItem(Guid ProductId, int Quantity);
public record CheckoutRequest(string StoreId, string Fulfillment, string Customer, string IdempotencyKey, List<CartItem> Items);
public record OrderDto(Guid Id, string Number, string Customer, string StoreId, string Fulfillment, string Status, decimal Total, decimal Shipping, DateTimeOffset CreatedAt, DateTimeOffset ReservationExpiresAt, string ReviewNote, List<LineDto> Lines);
public record LineDto(Guid ProductId, string Name, int Quantity, decimal UnitPrice);
public record LotDto(Guid Id, Guid ProductId, string Product, string Sku, string Category, string StoreId, string Code, DateOnly Expiry, int OnHand, int Reserved, int Available, bool Quarantine, string Status);
public record MovementDto(Guid Id, string Product, string Lot, string Kind, int Quantity, string Reason, string Actor, DateTimeOffset CreatedAt);
public record DashboardDto(int Orders, decimal Revenue, int Units, int LowStock, int Expiring, int PendingReview, int PublishedEvents, int ProcessedEvents, List<OrderDto> RecentOrders, List<MovementDto> RecentMovements);
public record ProductInput(string Name, string Brand, string Category, string Presentation, string Description, decimal Price, bool RequiresReview);
public record ReceiveInput(Guid ProductId, string StoreId, string Code, DateOnly Expiry, int Quantity);
public record AdjustInput(int Quantity, string Reason);
public record ReviewInput(bool Approved, string Reason);
public record TransitionInput(string Status);
public static class BusinessClock
{
    public static DateOnly Today => DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeBySystemTimeZoneId(DateTimeOffset.UtcNow, "America/Sao_Paulo").DateTime);
}
public static class Stores
{
    public static readonly StoreDto[] All = [
        new("centro", "Centro", "Av. Borges de Medeiros, 420 · Porto Alegre", "Seg–Sáb, 8h às 22h"),
        new("moinhos", "Moinhos de Vento", "Rua Padre Chagas, 180 · Porto Alegre", "Todos os dias, 8h às 22h"),
        new("iguatemi", "Iguatemi", "Av. João Wallig, 1800 · Porto Alegre", "Seg–Sáb, 10h às 22h")
    ];
    public static bool Valid(string id) => All.Any(s => s.Id == id);
}
public interface IFarmaService
{
    Task<DemoSession> CreateSession(CancellationToken ct);
    Task<DemoSession?> Session(Guid id, CancellationToken ct);
    Task<List<ProductDto>> Products(Guid session, string store, CancellationToken ct);
    Task<List<OrderDto>> Orders(Guid session, CancellationToken ct);
    Task<OrderDto> Checkout(Guid session, CheckoutRequest input, CancellationToken ct);
    Task<OrderDto> Transition(Guid session, Guid order, OrderStatus status, CancellationToken ct);
    Task<OrderDto> Review(Guid session, Guid order, ReviewInput input, CancellationToken ct);
    Task<List<LotDto>> Lots(Guid session, CancellationToken ct);
    Task<DashboardDto> Dashboard(Guid session, CancellationToken ct);
    Task Adjust(Guid session, Guid lot, AdjustInput input, CancellationToken ct);
    Task Receive(Guid session, ReceiveInput input, CancellationToken ct);
    Task<ProductDto> SaveProduct(Guid session, Guid? product, ProductInput input, CancellationToken ct);
    Task ExpireReservations(Guid session, CancellationToken ct);
}
