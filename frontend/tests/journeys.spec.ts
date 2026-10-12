import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", {
      name: "Adicionar Protetor solar facial",
      exact: true,
    }),
  ).toBeEnabled();
});
test("purchase, payment and administration fulfill the same order", async ({
  page,
}) => {
  await page
    .getByRole("button", {
      name: "Adicionar Protetor solar facial",
      exact: true,
    })
    .click();
  await page.getByRole("link", { name: "Carrinho, 1 itens" }).click();
  await page.getByRole("button", { name: "Criar pedido simulado" }).click();
  await expect(
    page.getByText("Aguardando pagamento", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Simular pagamento", exact: true })
    .click();
  await expect(page.locator(".order-card .badge")).toHaveText("Pago");
  await page.goto("/admin/orders");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Separar", exact: true }).click();
  await expect(page.locator("tbody .badge")).toHaveText("Em separação");
  await page
    .getByRole("button", { name: "Liberar retirada", exact: true })
    .click();
  await expect(page.locator("tbody .badge")).toHaveText("Pronto para retirada");
  await page.getByRole("button", { name: "Concluir", exact: true }).click();
  await expect(page.locator("tbody .badge")).toHaveText("Concluído");
  await page.goto("/orders");
  await expect(page.locator(".order-card .badge")).toHaveText("Concluído");
});
test("prescription review blocks payment until approved in administration", async ({
  page,
}) => {
  await page.goto("/catalog?category=Medicamentos");
  await page
    .getByRole("button", {
      name: "Adicionar Medicamento demonstrativo A",
      exact: true,
    })
    .click();
  await page.getByRole("link", { name: "Carrinho, 1 itens" }).click();
  await page.getByRole("button", { name: "Criar pedido simulado" }).click();
  await expect(
    page.getByRole("button", { name: "Simular pagamento", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".order-card .badge")).toHaveText("Em análise");
  await page.goto("/admin/reviews");
  await page.getByRole("button", { name: "Analisar", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar operação" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/orders");
  await expect(
    page.getByRole("button", { name: "Simular pagamento", exact: true }),
  ).toBeVisible();
});
test("inventory receipt, adjustment and product editing persist", async ({
  page,
}) => {
  await page.goto("/admin/stock");
  await page.getByRole("button", { name: "Receber estoque" }).click();
  await page.getByLabel("Código do lote").fill("E2E-LOTE");
  await page.getByLabel("Quantidade", { exact: true }).fill("8");
  await page.getByLabel("Validade", { exact: true }).fill("2028-12-31");
  await page.getByRole("button", { name: "Confirmar operação" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("textbox", { name: "Buscar produto, SKU ou lote" })
    .fill("E2E-LOTE");
  const row = page.locator("tbody tr");
  await expect(row).toHaveCount(1);
  await expect(row.locator("td").nth(3)).toHaveText("8");
  await row
    .getByRole("button", { name: "Ajustar lote E2E-LOTE centro" })
    .click();
  await page.getByLabel("Variação de quantidade").fill("-2");
  await page.getByLabel("Justificativa").fill("Conferência de estoque E2E");
  await page.getByRole("button", { name: "Confirmar operação" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(row.locator("td").nth(3)).toHaveText("6");
  await page.goto("/admin/products");
  await page.getByRole("button", { name: "Novo produto" }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Produto E2E");
  await page.getByRole("button", { name: "Confirmar operação" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("textbox", { name: "Buscar nome ou SKU" })
    .fill("Produto E2E");
  await expect(page.locator("tbody tr")).toHaveCount(1);
});
test("API rejects missing CSRF and session does not leak to another browser", async ({
  page,
  browser,
}) => {
  const other = await browser.newContext({
    baseURL: process.env.VF_BASE_URL || "http://localhost:3000",
  });
  const second = await other.newPage();
  await second.goto("/");
  await expect(
    second.getByRole("button", {
      name: "Adicionar Protetor solar facial",
      exact: true,
    }),
  ).toBeEnabled();
  const response = await page.request.post("/api/orders", { data: {} });
  expect(response.status()).toBe(403);
  await page
    .getByRole("button", {
      name: "Adicionar Protetor solar facial",
      exact: true,
    })
    .click();
  await page.getByRole("link", { name: "Carrinho, 1 itens" }).click();
  await page.getByRole("button", { name: "Criar pedido simulado" }).click();
  await second.goto("/orders");
  await expect(
    second.getByText("Seu primeiro pedido começa aqui."),
  ).toBeVisible();
  await other.close();
});
test("search, category and sorting filters work", async ({ page }) => {
  await page.getByRole("textbox", { name: "Buscar produtos" }).fill("solar");
  await page.getByRole("textbox", { name: "Buscar produtos" }).press("Enter");
  await expect(page.locator(".catalog-products .product-card")).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "Protetor solar facial", exact: true }),
  ).toBeVisible();
  await page.goto("/catalog?category=Vitaminas");
  await expect(page.locator(".catalog-products .product-card")).toHaveCount(5);
  await page.getByLabel("Ordenar produtos").selectOption("low");
  await expect(
    page
      .locator(".catalog-products .product-card")
      .first()
      .getByRole("link", { name: "Vitamina D", exact: true }),
  ).toBeVisible();
});
test("mobile store, cart and admin navigation do not overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: "../artifacts/store-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", {
      name: "Adicionar Protetor solar facial",
      exact: true,
    })
    .click();
  await page.getByRole("link", { name: "Carrinho, 1 itens" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Visão geral." }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page
    .getByRole("link", { name: "Estoque e lotes", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Estoque e lotes." }),
  ).toBeVisible();
});
test("capture desktop storefront and administration", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.screenshot({
    path: "../artifacts/store-desktop.png",
    fullPage: true,
  });
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Visão geral." }),
  ).toBeVisible();
  await expect(page.locator(".metric").first().locator("strong")).toHaveText(
    "0",
  );
  await page.screenshot({
    path: "../artifacts/admin-desktop.png",
    fullPage: true,
  });
});
