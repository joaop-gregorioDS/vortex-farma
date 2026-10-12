using VortexFarma.Domain;
using VortexFarma.Application;
namespace VortexFarma.Infrastructure;

public static class Seed
{
    public static void Populate(FarmaDb db, Guid session)
    {
        (string Name, string Category, string Presentation, decimal Price, decimal Original, string Color, string Shape, bool Review)[] catalog = [
            ("Protetor solar facial", "Dermocosméticos", "FPS 70 · 50 ml", 59.90m,79.90m,"#e2b563","tube",false),
            ("Vitamina C + Zinco", "Vitaminas", "30 cápsulas", 34.90m,49.90m,"#da873f","bottle",false),
            ("Sérum hidratante", "Dermocosméticos", "Ácido hialurônico · 30 ml", 69.90m,89.90m,"#be789b","dropper",false),
            ("Sabonete líquido suave", "Higiene", "Cuidado diário · 250 ml", 19.90m,26.90m,"#72a791","pump",false),
            ("Ômega 3", "Vitaminas", "60 cápsulas", 44.90m,59.90m,"#4a8196","bottle",false),
            ("Hidratante corporal", "Beleza", "Manteiga de karité · 200 ml", 29.90m,39.90m,"#bf9fb5","tube",false),
            ("Cuidado infantil", "Infantil", "Loção suave · 200 ml", 32.90m,42.90m,"#86a4c5","pump",false),
            ("Medicamento demonstrativo A", "Medicamentos", "Embalagem fictícia · 20 unidades", 12.90m,18.90m,"#cc0033","box",true),
            ("Multivitamínico diário", "Vitaminas", "60 cápsulas", 39.90m,54.90m,"#827aaf","bottle",false),
            ("Gel de limpeza facial", "Dermocosméticos", "Pele mista · 150 ml", 42.90m,59.90m,"#6fa49c","tube",false),
            ("Shampoo nutritivo", "Beleza", "Cabelos macios · 250 ml", 24.90m,32.90m,"#b99666","bottle",false),
            ("Condicionador nutritivo", "Beleza", "Cuidado capilar · 250 ml", 26.90m,34.90m,"#b99666","tube",false),
            ("Fio dental", "Higiene", "50 metros", 9.90m,12.90m,"#65a5b5","box",false),
            ("Escova dental macia", "Higiene", "Kit com 2 unidades", 14.90m,19.90m,"#6b93bc","box",false),
            ("Água micelar", "Dermocosméticos", "Limpeza suave · 200 ml", 27.90m,36.90m,"#c488a7","bottle",false),
            ("Creme para as mãos", "Beleza", "Amêndoas · 60 g", 16.90m,22.90m,"#bf9a83","tube",false),
            ("Lenços umedecidos", "Infantil", "48 unidades", 15.90m,21.90m,"#86a4c5","box",false),
            ("Sabonete infantil", "Infantil", "Sem fragrância · 200 ml", 22.90m,29.90m,"#86a4c5","pump",false),
            ("Vitamina D", "Vitaminas", "30 cápsulas", 28.90m,38.90m,"#e2b563","bottle",false),
            ("Medicamento demonstrativo B", "Medicamentos", "Embalagem fictícia · 10 unidades", 21.90m,29.90m,"#7c91b6","box",true),
            ("Álcool em gel", "Higiene", "70% · 250 ml", 11.90m,16.90m,"#72a791","pump",false),
            ("Bálsamo labial", "Beleza", "Hidratação · 10 g", 17.90m,24.90m,"#ba718e","tube",false),
            ("Magnésio", "Vitaminas", "60 cápsulas", 37.90m,49.90m,"#827aaf","bottle",false),
            ("Kit primeiros cuidados", "Medicamentos", "Itens demonstrativos · 1 kit", 24.90m,32.90m,"#cc0033","box",false)
        ];
        for (var i = 0; i < catalog.Length; i++)
        {
            var c = catalog[i];
            var product = new Product { SessionId = session, Sku = $"VF-{i + 1:000}", Name = c.Name, Category = c.Category, Presentation = c.Presentation, Description = "Produto fictício da linha Vortex Care, criado para demonstrar a experiência de compra. Imagens e informações ilustrativas; não constitui orientação de uso.", Price = c.Price, OriginalPrice = c.Original, Color = c.Color, Shape = c.Shape, RequiresReview = c.Review, Featured = i < 8 };
            db.Products.Add(product);
            foreach (var store in Stores.All)
            {
                var lot = new StockLot { SessionId = session, ProductId = product.Id, StoreId = store.Id, Code = $"VF26-{i + 1:000}-A", Expiry = BusinessClock.Today.AddDays(i == 5 ? 18 : 180 + i * 7), OnHand = i == 22 ? 0 : i == 18 ? 3 : 18 + i % 11 };
                db.Lots.Add(lot);
                db.Movements.Add(new StockMovement { SessionId = session, LotId = lot.Id, Kind = MovementKind.Receipt, Quantity = lot.OnHand, Reason = "Carga inicial da demonstração", Actor = "Sistema" });
                if (i is 0 or 7 or 11)
                {
                    var extra = new StockLot { SessionId = session, ProductId = product.Id, StoreId = store.Id, Code = $"VF26-{i + 1:000}-B", Expiry = BusinessClock.Today.AddDays(i == 11 ? -5 : 60), OnHand = 5 };
                    db.Lots.Add(extra);
                    db.Movements.Add(new StockMovement { SessionId = session, LotId = extra.Id, Kind = MovementKind.Receipt, Quantity = 5, Reason = "Carga inicial da demonstração", Actor = "Sistema" });
                }
            }
        }
    }
}
