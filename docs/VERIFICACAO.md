# Verificação da primeira versão

Executada em 30 de setembro de 2026, no ambiente local Windows e em containers Linux. Esta verificação não representa teste de carga nem publicação na VPS.

## Resultados

| Verificação | Resultado |
| --- | --- |
| Compilação da solução .NET | Sem erros ou avisos |
| Testes de domínio e PostgreSQL | 15 aprovados |
| TypeScript | Sem erros |
| Build Next.js | Aprovado |
| Construção de imagens Docker | API, migration, worker e frontend aprovados |
| Migrations em container | Aplicadas com sucesso |
| Saúde via Nginx | `/health` retorna `ready` |
| Jornadas Playwright via Nginx | 8 aprovadas |
| Cache Redis | Chave de catálogo confirmada após consulta à API |

## Cenários exercitados

- Disputa concorrente pela última unidade e rollback de compra com múltiplos itens.
- Idempotência de pedido e recusa de reutilização da chave com conteúdo diferente.
- Bloqueio de validade/quarentena e impossibilidade de reduzir saldo abaixo das reservas.
- Cancelamento e expiração sem liberação duplicada.
- FEFO, revisão fictícia obrigatória, saída e rastreabilidade por lote.
- Realocação quando um lote vence entre reserva e expedição.
- Isolamento de produtos, lotes e pedidos entre sessões.
- Correspondência entre saldo físico inicial e recebimentos na trilha de estoque.
- Compra, pagamento simulado, separação, retirada e conclusão pelo navegador.
- Recebimento, ajuste justificado e cadastro de produto no painel.
- Recusa de alterações sem CSRF, busca, filtros e ordenação.
- Navegação móvel sem transbordamento horizontal nos fluxos principais.
- Outbox publicada e evento consumido pelo RabbitMQ, confirmado nos indicadores persistidos.

## Artefatos visuais

Capturas de tela geradas em `artifacts/store-desktop.png`, `artifacts/admin-desktop.png` e `artifacts/store-mobile.png`. As capturas foram inspecionadas durante o desenvolvimento. Elas são artefatos locais e não entram no controle de versão por padrão.

O navegador de testes usou o Chrome já instalado, indicado por `VF_BROWSER_PATH`, pois o download automático do Chromium não ficou disponível. Os testes funcionam também com o Chromium instalado pelo Playwright.
