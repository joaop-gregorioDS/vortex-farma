# Vortex Farma — Vortex Labs

Planejamento atualizado em 30 de setembro de 2026. Nome de trabalho, sujeito a alteração.

## Definição do projeto

Farmácia fictícia com loja digital e administração operacional, criada para integrar o Vortex Labs no site da Vortex Software. A demonstração conecta a experiência do cliente ao gerenciamento de pedidos, estoque por unidade, lotes e validade.

A Panvel é referência para as jornadas de catálogo, compra e retirada. A identidade visual será da Vortex, com conteúdo e produtos demonstrativos próprios. O objetivo é apresentar decisões de engenharia e regras de negócio funcionando de ponta a ponta.

Primeira versão implementada neste diretório, com loja, administração, API, worker e ambiente Docker. A publicação na VPS fica para uma etapa posterior. Por orientação do proprietário, o site institucional da Vortex não deve ser alterado neste trabalho.

## Stack definida

| Camada | Tecnologia e responsabilidade |
| --- | --- |
| Interface | React 19, Next.js e TypeScript; loja e administração |
| API | C#, .NET 10 e ASP.NET Core; acesso e casos de uso |
| Persistência | Entity Framework Core 10 e Npgsql 10, configurado para PostgreSQL 16 |
| Banco | PostgreSQL 16; pedidos, estoque, auditoria e outbox |
| Cache | Redis 7; leituras e dados temporários reconstruíveis |
| Mensageria | RabbitMQ; eventos e processamento assíncrono |
| Worker | .NET 10; publicação da outbox, consumidores e tarefas agendadas |
| Arquitetura | Clean Architecture e DDD, com módulos de negócio |
| Hospedagem | Linux, VPS, Docker, Docker Compose e Nginx como gateway |

Next.js 16 é a base proposta. Fixar versões compatíveis de React 19, Next.js, dependências e imagens de containers ao iniciar a implementação, incluindo patches de segurança disponíveis. Fixar também a versão do RabbitMQ nessa etapa.

## Arquitetura proposta

Começar com uma API em monólito modular e um worker separado, facilitando a operação na VPS e mantendo fronteiras de domínio explícitas.

- **Domain:** entidades, objetos de valor, invariantes e eventos, sem dependência de EF Core, Redis ou RabbitMQ.
- **Application:** casos de uso, validação, contratos e coordenação de transações.
- **Infrastructure:** EF Core, PostgreSQL, cache, mensageria e serviços externos.
- **Api:** endpoints, autenticação, autorização, erros e OpenAPI.
- **Worker:** processamento em segundo plano.

Módulos: identidade e acesso, catálogo, estoque, pedidos, revisão de receita simulada e operação da demonstração. Uma aplicação Next.js terá a loja pública e rotas protegidas em `/admin`. Regras e permissões serão verificadas também na API.

## Experiência do cliente

1. Escolher uma unidade fictícia ou região de atendimento.
2. Buscar produtos, filtrar categorias e consultar detalhes e disponibilidade.
3. Adicionar itens ao carrinho; o carrinho ainda não reserva estoque.
4. Escolher entrega ou retirada e criar um pedido com reserva temporária.
5. Quando aplicável, acompanhar uma análise de receita fictícia.
6. Simular pagamento e acompanhar separação, entrega ou retirada.

Páginas: início, catálogo, produto, carrinho, finalização, acompanhamento do pedido e unidades. Identificar a compra como simulação, sem cobrança, expedição ou coleta de documentos de saúde reais.

## Experiência administrativa

| Área | Primeira versão |
| --- | --- |
| Visão geral | Pedidos pendentes, estoque baixo e validade próxima |
| Catálogo | Produtos, SKU, categorias, preços e classificação demonstrativa de venda |
| Estoque | Saldos por unidade e lote, recebimentos, ajustes justificados e histórico |
| Validade | Identificação e bloqueio de lotes vencidos ou em quarentena |
| Pedidos | Filtros, detalhes e transições autorizadas de status |
| Revisão | Aprovação ou rejeição de receita fictícia com justificativa |
| Auditoria | Quem alterou, quando, operação e motivo |

Perfis planejados para evolução: cliente, operador de estoque, atendente de pedidos, revisor farmacêutico demonstrativo e administrador. Nesta versão, o visitante recebe um perfil `DemoAdministrator` restrito à própria sessão; pode explorar loja e administração com os mesmos dados fictícios. Contas individuais e separação de papéis ficam para uma próxima entrega.

## Regras de negócio prioritárias

Estas regras são escolhas do laboratório. O fluxo de receita não representa validação sanitária ou habilitação para venda real.

| Regra | Comportamento esperado |
| --- | --- |
| Estoque por unidade e lote | Controlar saldo físico, reservado e indisponível; calcular o vendável após reservas e bloqueios |
| Validade | Impedir reserva e expedição de lote vencido; considerar a data de operação da unidade |
| FEFO | Alocar primeiro os lotes elegíveis que vencem antes |
| Reserva | Reservar na criação do pedido por prazo configurável; liberar uma única vez ao expirar ou cancelar |
| Concorrência | Duas compras da última unidade não podem ser ambas aprovadas |
| Movimentações | Registrar recebimento, reserva, liberação, venda, ajuste e descarte; não editar saldo diretamente na interface |
| Receita fictícia | Produto marcado como sujeito à revisão bloqueia pagamento e separação até aprovação no cenário demonstrativo |
| Revisão e prazo | Reserva expirada durante análise exige nova verificação e alocação antes de continuar |
| Valores | Calcular preços e descontos na API usando decimal; gravar os valores nos itens do pedido |
| Finalização | Revalidar preço, disponibilidade e estado do pedido na API |
| Idempotência | Requisição repetida não duplica pedido, pagamento simulado nem movimentação |
| Cancelamento | Liberar reservas antes da saída; após expedição, seguir fluxo de devolução |
| Devolução | Registrar entrada em quarentena e decidir a destinação; sem reposição automática |
| Rastreabilidade | Vincular item do pedido, lote, unidade e movimentação |

Fluxo: aguardando revisão, aguardando pagamento, pago, em separação, pronto para retirada ou enviado, concluído. Cancelado e expirado são saídas controladas. Produtos sem revisão seguem diretamente para aguardando pagamento.

Transferências entre unidades, fornecedores, compras de reposição, inventário completo, cupons e fidelidade entram numa segunda versão. Integrações fiscais, SNGPC, pagamentos reais e recebimento de receitas reais ficam fora do laboratório inicial.

## Consistência e eventos

- Pedido, reservas, movimentos relacionados e outbox são gravados em uma transação do PostgreSQL.
- A alocação usa controle de concorrência no banco, verificações de saldo e tratamento de conflitos. Redis não decide se há estoque para vender.
- O worker publica a outbox no RabbitMQ. Consumidores usam idempotência, confirmação de processamento, tentativas limitadas e fila de falhas.
- Alertas, indicadores e notificações simuladas podem ser assíncronos; a confirmação da reserva depende da transação no banco.
- Expiração usa o prazo persistido no banco e processamento repetível com segurança.
- Na separação, verificar novamente elegibilidade e validade dos lotes; realocar quando necessário ou interromper o avanço se não houver saldo elegível.

## Demonstração pública

Criar sessões isoladas com dados fictícios de loja e administração. Cliente e administrador da mesma sessão observam os mesmos pedidos e estoques; sessões diferentes ficam separadas.

Validar o identificador da sessão no servidor e incluí-lo em consultas, vínculos e chaves de cache. O administrador demonstrativo age apenas no próprio ambiente. Restauração e limpeza de dados são limitadas à sessão correspondente.

Base inicial proposta: 24 produtos, três unidades, diferentes lotes e pedidos pré-carregados. Incluir estoque baixo, indisponibilidade, lote vencido, revisão pendente e pedido cancelado.

## Identidade visual

Tokens extraídos do CSS público da Vortex:

| Uso | Cor |
| --- | --- |
| Principal | `#CC0033` |
| Rosa | `#EF5274` |
| Magenta | `#AE1269` |
| Fundo | `#FFFFFF` |
| Superfície | `#F8F7F8` |
| Destaque | `#FFF0F3` |
| Texto | `#29252A` |
| Texto secundário | `#665E66` |
| Borda | `#E7E1E5` |
| Erro | `#AD002B` |

Gradiente: `linear-gradient(115deg, #EF5274 0%, #CC0033 52%, #AE1269 100%)`.

Aplicar o gradiente em campanhas e apresentação do case. Manter produtos, formulários e tabelas sobre superfícies claras. Estados combinam texto, ícone e cor; validar contraste nos componentes finais.

## Hospedagem futura na VPS

Nginx recebe HTTPS e encaminha a interface para Next.js e `/api` para ASP.NET Core. Frontend, API, worker, PostgreSQL, Redis e RabbitMQ serão containers. Banco, cache e broker ficam na rede interna; somente o gateway é público.

Prever volumes persistentes, backups com teste de restauração, segredos fora do repositório, health checks, logs estruturados, métricas e rastreamento de requisições. Migrations serão etapa controlada de publicação. Dimensionar limites dos containers quando a capacidade da VPS for conhecida.

Endereço sugerido: `farma.vortexsoftware.tech`, ainda sem configuração. Preparar build reproduzível e publicação por imagem versionada, com rollback da aplicação e estratégia própria para alterações do banco.

## Etapas de entrega

1. **Fundação:** estrutura da solução, módulos, contratos, acesso e Docker local.
2. **Catálogo e estoque:** produtos, unidades, lotes, movimentos, FEFO e dados fictícios.
3. **Compra e operação:** carrinho, pedido, reservas, pagamento e revisão simulados.
4. **Interfaces:** loja e administração responsivas, incluindo erros e estados vazios.
5. **Processamento e qualidade:** outbox, RabbitMQ, cache, auditoria, isolamento e observabilidade.
6. **Lançamento:** preparação da VPS, demonstração publicada e inclusão no Vortex Labs.

Desenhar as primeiras telas junto dos contratos de API nas etapas 1 e 2 para validar a experiência antes de concluir o backend.

## Critérios de conclusão

- Compra simulada altera o estoque correto e aparece na administração da mesma sessão.
- Compras concorrentes não geram saldo negativo ou venda duplicada da última unidade.
- Vencimento, quarentena, revisão pendente e reserva expirada bloqueiam o avanço esperado.
- Cancelamento, expiração e mensagens repetidas não duplicam movimentos.
- Usuários não acessam outras sessões ou unidades sem autorização.
- Fluxos essenciais funcionam em celular, computador e por teclado.
- Testes de domínio cobrem invariantes; integração usa PostgreSQL real e exercita concorrência; testes ponta a ponta cobrem compra e administração.
- Desempenho é medido com carga, dados e recursos da VPS documentados. Definir metas antes da medição, sem alegar resultados antecipados.
- Loja e card identificam o caráter fictício e a autoria da Vortex.

## Referências

- [Vortex Software](https://vortexsoftware.tech/): seção `#projetos`, Vortex Labs & Cases.
- [CSS consultado da Vortex](https://vortexsoftware.tech/_next/static/css/index.CBSFUP5M.css): tokens de cores; endereço sujeito a alteração em novos builds.
- [Panvel](https://www.panvel.com/home/): organização de catálogo e compra.
- [ASP.NET Core 10](https://learn.microsoft.com/en-us/aspnet/core/release-notes/aspnetcore-10.0?view=aspnetcore-10.0).
- [EF Core 10](https://learn.microsoft.com/en-us/ef/core/what-is-new/ef-core-10.0/whatsnew).
- [Npgsql 10](https://www.npgsql.org/efcore/release-notes/10.0.html): provider e diferenças entre versões do PostgreSQL.
- [Next.js 16](https://nextjs.org/blog/next-16).
- [Concorrência no EF Core](https://learn.microsoft.com/en-us/ef/core/saving/concurrency).
- [Confirmações no RabbitMQ](https://www.rabbitmq.com/docs/confirms).
