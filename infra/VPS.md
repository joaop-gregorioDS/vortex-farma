# Preparação para a VPS

O Compose principal já separa banco, cache, broker, aplicação e gateway. A publicação externa não foi executada.

## Lançamento

1. Confirmar distribuição Linux, recursos disponíveis e política de backups.
2. Instalar Docker Engine e Compose no servidor.
3. Copiar o projeto ou usar imagens construídas e versionadas; preencher `.env` com senhas próprias.
4. Executar `docker compose up -d --build` e confirmar o término do serviço `migrate` e a saúde em `http://127.0.0.1:8088/health`.
5. Apontar o domínio escolhido para a VPS e configurar TLS no proxy externo do servidor.
6. Encaminhar esse proxy para `127.0.0.1:8088`, preservando o cabeçalho `X-Forwarded-Proto: https`.
7. Testar criação de sessão, cookie Secure em HTTPS, compra e gestão através do domínio antes de divulgar.

A porta do gateway fica ligada ao loopback para combinar com um proxy TLS na VPS. O Nginx interno confia no cabeçalho de protocolo desse proxy. Se o gateway for exposto diretamente, configure TLS nele e substitua `X-Forwarded-Proto` por `$scheme`; não aceite o cabeçalho arbitrário de visitantes.

## Operação

- Não expor PostgreSQL, Redis nem RabbitMQ à internet.
- Manter `.env` fora do controle de versão, com acesso restrito no servidor.
- Preservar os volumes `postgres-data`, `rabbit-data` e `keys-data` entre versões.
- Fazer backup PostgreSQL com `pg_dump` e testar restauração em banco separado.
- Definir limites de CPU/memória conforme a capacidade real da VPS.
- Usar imagens versionadas para rollback da aplicação. Revisar migrations: rollback de imagem não reverte automaticamente alterações do banco.
- Acompanhar logs de API/worker, saúde do banco, eventos pendentes na outbox e mensagens em `vf.failed`.
- Atualizar patches de .NET, Next.js e imagens antes de publicar e manter rotina de atualização.

## Limites desta arquitetura inicial

O laboratório usa um lock transacional por sessão, adequado ao isolamento da demonstração. Antes de operação comercial, reavaliar concorrência por produto/lote, retenção e auditoria, autenticação por usuário, papéis, limites de uso e observabilidade externa. As regras demonstrativas não substituem levantamento de requisitos sanitários e fiscais de uma operação real.
