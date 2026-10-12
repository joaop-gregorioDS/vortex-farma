using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using VortexFarma.Domain;
namespace VortexFarma.Infrastructure;

public sealed class FarmaDb(DbContextOptions<FarmaDb> options) : DbContext(options)
{
    public DbSet<DemoSession> Sessions => Set<DemoSession>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<StockLot> Lots => Set<StockLot>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<StockMovement> Movements => Set<StockMovement>();
    public DbSet<OutboxEvent> Outbox => Set<OutboxEvent>();
    public DbSet<ProcessedEvent> Inbox => Set<ProcessedEvent>();
    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Product>().HasAlternateKey(x => new { x.SessionId, x.Id });
        b.Entity<Product>().HasIndex(x => new { x.SessionId, x.Sku }).IsUnique();
        b.Entity<Product>().HasOne<DemoSession>().WithMany().HasForeignKey(x => x.SessionId).OnDelete(DeleteBehavior.Cascade);
        b.Entity<Product>().Property(x => x.Price).HasPrecision(12, 2);
        b.Entity<Product>().Property(x => x.OriginalPrice).HasPrecision(12, 2);
        b.Entity<StockLot>().HasAlternateKey(x => new { x.SessionId, x.Id });
        b.Entity<StockLot>().HasOne<Product>().WithMany().HasForeignKey(x => new { x.SessionId, x.ProductId }).HasPrincipalKey(x => new { x.SessionId, x.Id }).OnDelete(DeleteBehavior.Cascade);
        b.Entity<StockLot>().HasIndex(x => new { x.SessionId, x.ProductId, x.StoreId, x.Code }).IsUnique();
        b.Entity<StockLot>().ToTable(t => t.HasCheckConstraint("CK_Lot_Balance", "\"OnHand\" >= 0 AND \"Reserved\" >= 0 AND \"Reserved\" <= \"OnHand\""));
        b.Entity<Order>().HasAlternateKey(x => new { x.SessionId, x.Id });
        b.Entity<Order>().HasOne<DemoSession>().WithMany().HasForeignKey(x => x.SessionId).OnDelete(DeleteBehavior.Cascade);
        b.Entity<Order>().HasIndex(x => new { x.SessionId, x.IdempotencyKey }).IsUnique();
        b.Entity<Order>().Property(x => x.Status).HasConversion<string>();
        b.Entity<Order>().Property(x => x.Total).HasPrecision(12, 2);
        b.Entity<Order>().Property(x => x.Shipping).HasPrecision(12, 2);
        b.Entity<Order>().Ignore(x => x.HasReservation);
        b.Entity<Order>().HasMany(x => x.Lines).WithOne().HasForeignKey(x => new { x.SessionId, x.OrderId }).HasPrincipalKey(x => new { x.SessionId, x.Id });
        b.Entity<Order>().HasMany(x => x.Allocations).WithOne().HasForeignKey(x => new { x.SessionId, x.OrderId }).HasPrincipalKey(x => new { x.SessionId, x.Id });
        b.Entity<OrderLine>().HasOne<Product>().WithMany().HasForeignKey(x => new { x.SessionId, x.ProductId }).HasPrincipalKey(x => new { x.SessionId, x.Id }).OnDelete(DeleteBehavior.Restrict);
        b.Entity<OrderLine>().Property(x => x.UnitPrice).HasPrecision(12, 2);
        b.Entity<Allocation>().HasOne<StockLot>().WithMany().HasForeignKey(x => new { x.SessionId, x.LotId }).HasPrincipalKey(x => new { x.SessionId, x.Id }).OnDelete(DeleteBehavior.Restrict);
        b.Entity<StockMovement>().HasOne<StockLot>().WithMany().HasForeignKey(x => new { x.SessionId, x.LotId }).HasPrincipalKey(x => new { x.SessionId, x.Id }).OnDelete(DeleteBehavior.Cascade);
        b.Entity<StockMovement>().Property(x => x.Kind).HasConversion<string>();
        b.Entity<StockMovement>().HasIndex(x => new { x.SessionId, x.CreatedAt });
        b.Entity<OutboxEvent>().HasOne<DemoSession>().WithMany().HasForeignKey(x => x.SessionId).OnDelete(DeleteBehavior.Cascade);
        b.Entity<OutboxEvent>().HasIndex(x => x.PublishedAt);
        b.Entity<ProcessedEvent>().HasOne<DemoSession>().WithMany().HasForeignKey(x => x.SessionId).OnDelete(DeleteBehavior.Cascade);
    }
}
public sealed class FarmaDbFactory : IDesignTimeDbContextFactory<FarmaDb>
{
    public FarmaDb CreateDbContext(string[] args) => new(new DbContextOptionsBuilder<FarmaDb>().UseNpgsql(Environment.GetEnvironmentVariable("ConnectionStrings__Postgres") ?? "Host=localhost;Port=55432;Database=vortex_farma;Username=vortex;Password=vortex_local_only", o => o.SetPostgresVersion(16, 0)).Options);
}
