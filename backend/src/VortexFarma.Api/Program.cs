using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using VortexFarma.Application;
using VortexFarma.Infrastructure;
using VortexFarma.Domain;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddFarma(builder.Configuration);
builder.Services.AddOpenApi();
var protection = builder.Services.AddDataProtection().SetApplicationName("VortexFarma");
if (builder.Configuration["KeysPath"] is { Length: > 0 } keys) protection.PersistKeysToFileSystem(new DirectoryInfo(keys));
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(o =>
{
    o.Cookie.Name = "vf-demo"; o.Cookie.HttpOnly = true; o.Cookie.SameSite = SameSiteMode.Strict;
    o.ExpireTimeSpan = TimeSpan.FromDays(1); o.SlidingExpiration = false;
    o.Events.OnRedirectToLogin = c => { c.Response.StatusCode = 401; return Task.CompletedTask; };
    o.Events.OnRedirectToAccessDenied = c => { c.Response.StatusCode = 403; return Task.CompletedTask; };
});
builder.Services.AddAuthorization(o => o.AddPolicy("DemoAdmin", p => p.RequireRole("DemoAdministrator")));
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    o.AddPolicy("sessions", ctx => System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(ctx.Connection.RemoteIpAddress?.ToString() ?? "local", _ => new() { PermitLimit = 20, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    // Only the gateway is exposed in Compose. Trust the explicitly configured private network.
    if (builder.Configuration["ProxyNetwork"] is { Length: > 0 } network) o.KnownIPNetworks.Add(System.Net.IPNetwork.Parse(network));
});
var app = builder.Build();
app.UseForwardedHeaders();
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
    ctx.Response.Headers["Cache-Control"] = "no-store";
    try { await next(); }
    catch (RuleException ex) { ctx.Response.StatusCode = 400; await ctx.Response.WriteAsJsonAsync(new { error = ex.Message }); }
    catch (Exception ex) when (ex is not OperationCanceledException) { app.Logger.LogError(ex, "Falha na requisição {TraceId}", ctx.TraceIdentifier); ctx.Response.StatusCode = 500; await ctx.Response.WriteAsJsonAsync(new { error = "Não foi possível concluir a operação. Tente novamente.", traceId = ctx.TraceIdentifier }); }
});
app.UseRateLimiter(); app.UseAuthentication(); app.UseAuthorization();
app.Use(async (ctx, next) =>
{
    if (ctx.Request.Path.StartsWithSegments("/api") && ctx.User.Identity?.IsAuthenticated == true)
    {
        if (!Guid.TryParse(ctx.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)) { ctx.Response.StatusCode = 401; return; }
        var service = ctx.RequestServices.GetRequiredService<IFarmaService>(); var session = await service.Session(id, ctx.RequestAborted);
        if (session is null) { await ctx.SignOutAsync(); ctx.Response.StatusCode = 401; return; }
        if (ctx.Request.Method is not ("GET" or "HEAD" or "OPTIONS") && ctx.Request.Path != "/api/session" && ctx.Request.Headers["X-VF-CSRF"] != session.CsrfToken) { ctx.Response.StatusCode = 403; await ctx.Response.WriteAsJsonAsync(new { error = "Token de sessão inválido. Atualize a página." }); return; }
    }
    await next();
});
app.MapGet("/health", async (FarmaDb db, CancellationToken ct) => await db.Database.CanConnectAsync(ct) ? Results.Ok(new { status = "ready" }) : Results.StatusCode(503));
app.MapOpenApi();
Guid SessionId(ClaimsPrincipal user) => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
object SessionInfo(DemoSession s) => new { id = s.Id, csrfToken = s.CsrfToken, expiresAt = s.ExpiresAt, stores = Stores.All, role = "DemoAdministrator" };
app.MapPost("/api/session", async (HttpContext ctx, IFarmaService service, CancellationToken ct) =>
{
    // Reject cross-origin session replacement while allowing same-origin proxy requests.
    if (ctx.Request.Headers["Sec-Fetch-Site"] == "cross-site") return Results.StatusCode(403);
    var session = await service.CreateSession(ct);
    var identity = new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, session.Id.ToString()), new Claim(ClaimTypes.Role, "DemoAdministrator")], CookieAuthenticationDefaults.AuthenticationScheme);
    await ctx.SignInAsync(new ClaimsPrincipal(identity), new AuthenticationProperties { IsPersistent = true, ExpiresUtc = session.ExpiresAt });
    return Results.Ok(SessionInfo(session));
}).RequireRateLimiting("sessions");
app.MapGet("/api/session", async (ClaimsPrincipal user, IFarmaService service, CancellationToken ct) => { var s = await service.Session(SessionId(user), ct); return s is null ? Results.Unauthorized() : Results.Ok(SessionInfo(s)); }).RequireAuthorization();
var api = app.MapGroup("/api").RequireAuthorization();
api.MapGet("/products", async (string? store, ClaimsPrincipal user, IFarmaService service, CancellationToken ct) => Results.Ok(await service.Products(SessionId(user), store ?? "centro", ct)));
api.MapGet("/orders", async (ClaimsPrincipal user, IFarmaService service, CancellationToken ct) => Results.Ok(await service.Orders(SessionId(user), ct)));
api.MapPost("/orders", async (CheckoutRequest input, ClaimsPrincipal user, IFarmaService service, CancellationToken ct) => Results.Ok(await service.Checkout(SessionId(user), input, ct)));
api.MapPost("/orders/{id:guid}/payment", async (Guid id, ClaimsPrincipal user, IFarmaService service, CancellationToken ct) => Results.Ok(await service.Transition(SessionId(user), id, OrderStatus.Paid, ct)));
api.MapPost("/orders/{id:guid}/cancel", async (Guid id, ClaimsPrincipal user, IFarmaService service, CancellationToken ct) => Results.Ok(await service.Transition(SessionId(user), id, OrderStatus.Cancelled, ct)));
var admin = api.MapGroup("/admin").RequireAuthorization("DemoAdmin");
admin.MapGet("/dashboard", async (ClaimsPrincipal user, IFarmaService service, CancellationToken ct) => Results.Ok(await service.Dashboard(SessionId(user), ct)));
admin.MapGet("/lots", async (ClaimsPrincipal user, IFarmaService service, CancellationToken ct) => Results.Ok(await service.Lots(SessionId(user), ct)));
admin.MapPost("/lots/{id:guid}/adjust", async (Guid id, AdjustInput input, ClaimsPrincipal user, IFarmaService service, CancellationToken ct) => { await service.Adjust(SessionId(user), id, input, ct); return Results.Ok(new { success = true }); });
admin.MapPost("/lots/receive", async (ReceiveInput input, ClaimsPrincipal user, IFarmaService service, CancellationToken ct) => { await service.Receive(SessionId(user), input, ct); return Results.Ok(new { success = true }); });
admin.MapPost("/products", async (ProductInput input, ClaimsPrincipal user, IFarmaService service, CancellationToken ct) => Results.Ok(await service.SaveProduct(SessionId(user), null, input, ct)));
admin.MapPut("/products/{id:guid}", async (Guid id, ProductInput input, ClaimsPrincipal user, IFarmaService service, CancellationToken ct) => Results.Ok(await service.SaveProduct(SessionId(user), id, input, ct)));
admin.MapPost("/orders/{id:guid}/review", async (Guid id, ReviewInput input, ClaimsPrincipal user, IFarmaService service, CancellationToken ct) => Results.Ok(await service.Review(SessionId(user), id, input, ct)));
admin.MapPost("/orders/{id:guid}/status", async (Guid id, TransitionInput input, ClaimsPrincipal user, IFarmaService service, CancellationToken ct) =>
{
    if (!Enum.TryParse<OrderStatus>(input.Status, out var status) || status is not (OrderStatus.Picking or OrderStatus.Ready or OrderStatus.Shipped or OrderStatus.Completed)) throw new RuleException("Status inválido.");
    return Results.Ok(await service.Transition(SessionId(user), id, status, ct));
});
if (args.Contains("--migrate")) { using var scope = app.Services.CreateScope(); await scope.ServiceProvider.GetRequiredService<FarmaDb>().Database.MigrateAsync(); return; }
app.Run();
public partial class Program;
