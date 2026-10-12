using VortexFarma.Domain;
using VortexFarma.Application;
namespace VortexFarma.Tests;

public class DomainTests
{
    [Fact]
    public void Expired_and_quarantined_lots_cannot_be_reserved()
    {
        var lot = new StockLot { OnHand = 10, Expiry = BusinessClock.Today.AddDays(-1) };
        Assert.Throws<RuleException>(() => lot.Reserve(1, BusinessClock.Today));
        lot.Expiry = BusinessClock.Today.AddDays(30); lot.Quarantine = true;
        Assert.Throws<RuleException>(() => lot.Reserve(1, BusinessClock.Today));
    }
    [Fact]
    public void Stock_cannot_be_adjusted_below_reservations()
    {
        var lot = new StockLot { OnHand = 10, Reserved = 8 }; Assert.Throws<RuleException>(() => lot.Adjust(-3)); Assert.Equal(10, lot.OnHand);
    }
    [Fact]
    public void Dispensing_rechecks_validity_after_reservation()
    {
        var lot = new StockLot { OnHand = 5, Reserved = 2, Expiry = BusinessClock.Today.AddDays(-1) }; Assert.Throws<RuleException>(() => lot.Sell(2, BusinessClock.Today)); Assert.Equal(2, lot.Reserved);
    }
    [Fact]
    public void Review_cannot_be_bypassed_by_payment()
    {
        var order = new Order { Status = OrderStatus.AwaitingReview }; Assert.Throws<RuleException>(() => order.Transition(OrderStatus.Paid)); Assert.Equal(OrderStatus.AwaitingReview, order.Status);
    }
    [Fact]
    public void Fulfillment_must_match_order_modality()
    {
        var order = new Order { Status = OrderStatus.Picking, Fulfillment = "delivery" }; Assert.Throws<RuleException>(() => order.Transition(OrderStatus.Ready)); Assert.Equal(OrderStatus.Picking, order.Status);
    }
    [Fact]
    public void Dispatched_orders_cannot_be_cancelled_as_reservations()
    {
        var order = new Order { Status = OrderStatus.Shipped, Fulfillment = "delivery" }; Assert.Throws<RuleException>(() => order.Transition(OrderStatus.Cancelled));
    }
}
