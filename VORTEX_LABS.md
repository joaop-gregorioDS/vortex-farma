# Apresentação do Vortex Farma no Vortex Labs

Proposta para a seção existente `#projetos` do [site da Vortex](https://vortexsoftware.tech/). Este arquivo prepara a inclusão; o site público ainda não foi alterado.

## Conteúdo do card

**Etiqueta:** VORTEX LABS · VAREJO FARMACÊUTICO

**Título provisório:** Vortex Farma

**Subtítulo:** Farmácia digital e gestão operacional.

**Descrição:** Uma farmácia fictícia que conecta compra online, retirada em loja e gestão de estoque por unidade, lote e validade. Um laboratório de engenharia para explorar consistência de pedidos, processamento assíncrono e regras de operação do varejo farmacêutico.

**Tecnologias:** C# · .NET 10 · ASP.NET Core · EF Core · PostgreSQL 16 · Redis 7 · RabbitMQ · React 19 · Next.js · TypeScript · Docker · Nginx

**Destaques:** Clean Architecture e DDD; reservas com controle de concorrência; rastreabilidade por lote; eventos com outbox; administração integrada à jornada de compra.

**Identificação:** PROJETO DEMONSTRATIVO · VORTEX LABS

## Acessos propostos

- **Explorar a farmácia:** loja em uma sessão demonstrativa.
- **Explorar a administração:** painel com dados fictícios da mesma sessão, usando um perfil de demonstração restrito.
- **Conhecer a arquitetura:** módulos, decisões, regras e resultados medidos após implementação.

Endereço sugerido: `farma.vortexsoftware.tech`. Definir o destino dos botões após provisionar o endereço e publicar a aplicação.

## Roteiro da demonstração

1. Criar uma sessão e escolher uma unidade.
2. Comprar um produto disponível.
3. Encontrar o pedido e a reserva na administração.
4. Concluir a operação simulada e observar a movimentação do lote.
5. Explorar cenários de validade, cancelamento e revisão fictícia.

## Material do case

Preparar imagens reais da aplicação para celular e computador, uma visão da administração e um diagrama de arquitetura. Descrever problema, solução, decisões técnicas e limites da simulação. Acrescentar resultados de testes e desempenho depois de medidos.

## Integração no site institucional

A seção atual apresenta outros laboratórios com badge, título, descrição e informações técnicas. Manter esse padrão e a paleta da Vortex.

Para implementar a inclusão, localizar o repositório ou fonte de edição do site institucional. O diretório atual contém o planejamento da farmácia, sem os arquivos do site da Vortex. Usar a fonte original e o fluxo de publicação existente na etapa de lançamento.
