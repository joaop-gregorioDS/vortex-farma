# Vortex Farma

Farmácia fictícia do Vortex Labs. Loja e administração compartilham uma API real, com PostgreSQL, Redis e RabbitMQ. O site institucional da Vortex Software não faz parte desta implementação.

## Executar localmente

Requisitos: .NET SDK 10.0.401 ou versão compatível, Node.js 24, npm e Docker com containers Linux.

No Windows, o script abaixo inicia PostgreSQL, Redis e RabbitMQ, aplica migrations, abre API e worker em segundo plano e inicia Next.js no terminal atual:

```powershell
.\scripts\start-dev.ps1
```

Ou execute manualmente, a partir da raiz:

```powershell
docker compose -f infra/compose.services.yml up -d --wait
dotnet run --project backend/src/VortexFarma.Api --no-launch-profile -- --migrate
dotnet run --project backend/src/VortexFarma.Api --no-launch-profile --urls http://127.0.0.1:5080
```

Em outros terminais:

```powershell
dotnet run --project backend/src/VortexFarma.Worker --no-launch-profile
```

```powershell
cd frontend
npm ci
npm run dev
```

- Loja: `http://localhost:3000`
- Administração: `http://localhost:3000/admin`
- Saúde da API: `http://127.0.0.1:5080/health`
- Contrato OpenAPI: `http://127.0.0.1:5080/openapi/v1.json`
- RabbitMQ local: `http://localhost:55673` (usuário `vortex`, senha local `vortex_local_only`).

O Compose de serviços expõe suas portas apenas no loopback. As credenciais padrão são exclusivas para desenvolvimento.

## Executar tudo em containers

Copie `.env.example` para `.env` e substitua as duas senhas por valores aleatórios próprios:

```powershell
Copy-Item .env.example .env
docker compose up -d --build
```

Abra `http://localhost:8088`. Esse ambiente utiliza volumes e banco separados do desenvolvimento. Um serviço de execução única aplica migrations antes de API e worker iniciarem. Apenas Nginx expõe uma porta no loopback; banco, Redis e RabbitMQ não têm portas públicas.

O volume das chaves de Data Protection mantém a validade dos cookies durante reinicializações. O frontend e os processos .NET executam com usuários sem privilégios de root.

### Atalho Swagger

A loja e a gestão reservam o atalho **Swagger · Em breve**, desabilitado enquanto o endereço não estiver configurado. Quando a interface Swagger da API desta farmácia estiver publicada na VPS, defina `NEXT_PUBLIC_SWAGGER_URL` no `.env` da raiz com a URL pública correta e execute `docker compose up -d --build web`. O atalho passa a abrir essa URL em uma nova aba.

Para desenvolvimento fora do Docker, defina a mesma variável em `frontend/.env.local` e reinicie o Next.js. A URL é incorporada ao frontend durante o build; alterações na VPS exigem reconstruir o serviço `web`. O atalho apenas aponta para a documentação: a publicação da interface Swagger e de suas rotas deve ser configurada na API e no proxy.

## Demonstração

1. Abra a loja: uma sessão isolada de 24 horas é criada com 24 produtos e três unidades fictícias.
2. Adicione um produto, escolha retirada ou entrega e crie um pedido.
3. Simule pagamento em **Meus pedidos**. Produtos marcados para revisão exigem análise fictícia no painel antes disso.
4. Abra **Gestão → Pedidos** e avance para separação, retirada/envio e conclusão.
5. Consulte **Estoque e lotes** e **Movimentações** para acompanhar reserva e saída.
6. Receba um lote, ajuste saldo com justificativa ou cadastre/edite um produto. A alteração pertence somente à sessão atual.

Reiniciar cria uma nova sessão. O worker remove sessões expiradas e seus dados. A função administrativa é deliberadamente concedida ao visitante como `DemoAdministrator`, restrita à sua sessão. Não se trata de autenticação de uma farmácia real; contas individuais e gestão de perfis ficam para uma evolução.

## Regras implementadas

- Estoque físico e reservado por unidade/lote, FEFO e bloqueio de validade/quarentena.
- Reserva de 20 minutos ao criar pedido. Expiração, cancelamento e revisão rejeitada liberam o saldo uma única vez.
- Validade e elegibilidade são novamente verificadas na saída; lote indisponível é realocado, se houver saldo.
- PostgreSQL garante transação e consistência; advisory lock por sessão coordena alterações concorrentes, sem depender de Redis.
- Criação de pedido idempotente, com verificação do conteúdo associado à chave.
- Preços em decimal, snapshot por item e cálculo na API. Entrega simulada custa R$ 9,90 abaixo de R$ 149; retirada é grátis.
- Outbox transacional, publicação com confirmação RabbitMQ, consumidor idempotente e fila `vf.failed` para falhas de consumo. Publicações não confirmadas são tentadas novamente; mensagens inválidas no consumidor seguem para revisão na fila de falhas.
- Cookie assinado HttpOnly, SameSite Strict, token CSRF nas alterações, autorização por sessão e relações com chaves compostas.
- Redis armazena apresentação do catálogo por até 20 segundos. Saldo de estoque sempre vem do banco.

## Estrutura

```text
backend/src/
  VortexFarma.Domain/          Entidades, invariantes e transições
  VortexFarma.Application/     Contratos de casos de uso e DTOs
  VortexFarma.Infrastructure/  Persistência e implementação transacional dos casos de uso
  VortexFarma.Api/             Endpoints, cookie, CSRF, autorização e OpenAPI
  VortexFarma.Worker/          Outbox, RabbitMQ, reservas e limpeza de sessões
backend/tests/                Testes de domínio e integração PostgreSQL
frontend/src/                 Next.js App Router, loja e administração
frontend/tests/               Testes de jornadas com Playwright
infra/                        Nginx e serviços de desenvolvimento
```

## Verificação

Com os serviços de desenvolvimento ativos:

```powershell
dotnet test VortexFarma.slnx
cd frontend
npm run typecheck
npm run build
npx playwright install chromium
npm run dev
```

Em outro terminal, dentro de `frontend`:

```powershell
npm run test:e2e
```

Os testes de integração criam `vortex_farma_tests`, separado do banco da aplicação. Use `VF_TEST_POSTGRES` para uma conexão própria. Playwright aceita `VF_BASE_URL` para testar o gateway e `VF_BROWSER_PATH` para um Chromium já instalado, caso o download esteja indisponível.

## Próximas evoluções

Fornecedores, transferências entre lojas, inventário, devoluções com quarentena, fidelidade e contas individuais não fazem parte desta primeira versão. Receitas são fictícias; não há documentos médicos, cobrança, venda, dispensação, integração fiscal ou SNGPC. Não há métricas de desempenho alegadas sem medição.

A preparação para VPS está em `infra/VPS.md`. Domínio, TLS e publicação na VPS ainda não foram configurados.
