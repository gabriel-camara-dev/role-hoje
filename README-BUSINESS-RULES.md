# Regras de Negocio

Este documento consolida as regras de negocio observadas no codigo atual e registra inconsistencias ou melhorias recomendadas. Ele descreve o comportamento real implementado na API, nao apenas a intencao de produto.

## Escopo

Modulos cobertos:

- Usuarios e autenticacao.
- Perfil e foto de perfil.
- OAuth com Google.
- Lugares do Onde Hoje.
- Votos, mapa, historico e ranking.
- Grupos.
- Amizades.
- Estimativas de presenca.
- Admin dashboard.

## Usuarios

### Cadastro local

- O cadastro local cria usuarios com `name`, `username`, `email`, `cpf` e `password`.
- `name` deve ter entre 4 e 255 caracteres.
- `username` deve ter entre 3 e 60 caracteres.
- `email`, `username` e `cpf` nao podem conflitar com outro usuario existente.
- A senha e armazenada como hash.
- O cadastro local publica o evento `user.created`.
- Foto de perfil nao faz parte do cadastro local. Ela e enviada depois por uma rota propria.

### Atualizacao de usuario

- Um usuario pode ser atualizado por `publicId`.
- Campos atualizaveis: `name`, `username`, `email`, `cpf` e `password`.
- Ao alterar email, username ou CPF, o sistema verifica conflito contra outros usuarios.
- Ao alterar senha, o sistema gera novo hash e preenche `passwordChangedAt`.
- A atualizacao publica o evento `user.updated` com os campos alterados.

### Remocao de usuario

- Um usuario pode ser removido por `publicId`.
- Se o usuario nao existe, a API retorna erro de recurso nao encontrado.
- Ao remover, o sistema publica o evento `user.deleted`.
- As regras de cascata ficam a cargo das relacoes Prisma/Banco.

### Listagem e perfil

- A listagem de usuarios e paginada.
- Filtros disponiveis: `name`, `username`, `email` e `cpf`.
- O perfil de usuario e buscado por `publicId`.
- A resposta publica do usuario inclui `avatarUrl` quando existe avatar salvo.

## Autenticacao

### Login com senha

- O login aceita `email`, `cpf` ou `username` como identificador.
- Usuario sem `passwordHash` nao consegue autenticar pelo login local.
- Credenciais invalidas retornam erro de autenticacao invalida.
- O login local publica o evento `user.authenticated`.
- O JWT emitido inclui `sub` com o `publicId` do usuario e `role`.
- O token expira em 1 dia.

### Login com Google

- O OAuth Google usa a estrategia Passport `google`.
- O Google deve retornar pelo menos `googleId`, `email` e `name`.
- Se ja existe usuario com o mesmo `googleId`, esse usuario e autenticado.
- Se nao existe `googleId`, mas existe usuario com o mesmo email, a conta existente e vinculada ao `googleId`.
- Se nao existe usuario com o mesmo email, o sistema cria uma conta sem CPF e sem senha local.
- Para contas criadas pelo Google, o `username` e derivado do email e recebe sufixo aleatorio se houver conflito.
- Se o Google retornar foto de perfil e o usuario ainda nao tiver avatar, a imagem e importada, validada e armazenada criptografada.
- Falha ao importar a foto do Google nao bloqueia o login.

## Foto de Perfil

- A troca de foto e uma rota separada: `PATCH /users/me/avatar`.
- A foto e opcional durante o cadastro.
- Upload usa `multipart/form-data` com campo `file`.
- O upload e autenticado.
- Formatos aceitos: JPEG, PNG e WEBP.
- Tamanho maximo: 2 MB.
- A foto e armazenada criptografada em disco com AES-256-GCM.
- Metadados salvos no usuario: caminho criptografado, IV, auth tag, MIME type, nome original e data de atualizacao.
- A leitura da foto acontece por `GET /users/:publicId/avatar`.
- A rota de leitura e publica e descriptografa a imagem no momento da resposta.
- A criptografia protege o arquivo em repouso; a imagem ainda e publica via endpoint.

## Lugares

### Cadastro e atualizacao de lugar

- Apenas usuario autenticado pode cadastrar ou atualizar lugar.
- Lugares sao identificados por `googlePlaceId`.
- Se o `googlePlaceId` ja existe, o lugar e atualizado.
- Se nao existe, o lugar e criado.
- Campos de coordenada respeitam limites geograficos:
  - Latitude entre -90 e 90.
  - Longitude entre -180 e 180.
- Lugar criado ou atualizado fica ativo.
- O sistema publica o evento `onde-hoje.place.upserted`.

### Listagem de lugares

- A listagem de lugares e publica.
- Apenas lugares ativos sao retornados.
- Filtros disponiveis:
  - Texto por nome ou endereco formatado.
  - Cidade.
  - Proximidade por latitude, longitude e raio.
- `radiusKm` exige latitude e longitude.
- Raio maximo aceito: 100 km.
- Quando coordenadas sao enviadas, a resposta pode incluir `distanceKm`.
- A busca por distancia usa uma caixa geografica aproximada no banco e refina com Haversine em memoria.

## Votos

### Criacao e atualizacao de voto

- Votar exige usuario autenticado.
- Rotas de voto:
  - `POST /places/:placePublicId/votes`.
  - `POST /places/:placePublicId/votes/today` mantida por compatibilidade.
- O body pode conter:
  - `day` no formato `YYYY-MM-DD`.
  - `groupPublicId` opcional.
  - `note` opcional, com ate 240 caracteres.
- Se `day` nao for enviado, o sistema usa a data de hoje.
- Um voto e unico por usuario, lugar, escopo e dia.
- Se o usuario votar novamente no mesmo lugar, escopo e dia, o voto e atualizado.
- O status do voto atualizado volta para `ACTIVE`.
- O sistema publica o evento `onde-hoje.place.voted-today`, mesmo quando o voto e para outro dia.

### Limite de votos

- Cada usuario pode ter no maximo 3 votos ativos por dia.
- O limite e por dia escolhido, nao global.
- Votos em outro dia nao consomem o limite do dia atual.
- Atualizar o mesmo voto nao conta como voto adicional.
- A contagem exclui o alvo atual, permitindo edicao do voto existente.
- Ao ultrapassar o limite, a API retorna conflito.

### Escopo de votos

- Voto sem `groupPublicId` usa escopo publico/global.
- Voto com `groupPublicId` usa escopo do grupo.
- O `scopeKey` do voto e `global` para publico ou o `publicId` do grupo.

## Mapa, Historico e Ranking

### Mapa de hoje

- `GET /map/today` e publico.
- Retorna lugares com votos ativos no dia atual.
- Pode filtrar por cidade.
- Pode filtrar por grupo.
- Quando sem grupo, retorna apenas votos publicos/globais.
- Lugares sao ordenados por quantidade de votos decrescente.
- Cada lugar retorna ate 8 votantes recentes.

### Ranking de lugares

- `GET /map/top-places` e publico.
- Retorna os lugares mais votados de hoje.
- Pode filtrar por cidade.
- Pode filtrar por grupo.
- Quando sem grupo, retorna o ranking publico/global.
- `limit` e opcional e limitado a 50 na camada HTTP.
- Padrao de limite no repositorio: 10.

### Historico de mapa

- `GET /map/history` e publico.
- Retorna votos ativos agrupados por dia e lugar.
- Padrao: ultimos 7 dias.
- Range maximo aceito: 31 dias.
- Pode filtrar por cidade, grupo e proximidade.
- Quando coordenadas e raio sao enviados, filtra por distancia.
- Cada lugar no historico retorna ate 8 votantes.

### Historico pessoal de votos

- `GET /me/votes` exige autenticacao.
- Retorna votos ativos do usuario autenticado.
- Padrao de limite: 30.
- Limite maximo na camada HTTP: 100.
- Inclui dados do grupo quando o voto pertence a um grupo.

## Estimativa de Presenca

- `GET /places/:placePublicId/attendance/estimate` e publico.
- A estimativa exige `scheduledAt`.
- `radiusKm` e opcional; padrao: 1 km.
- Raio maximo aceito: 100 km.
- A estimativa usa votos ativos no dia de `scheduledAt` dentro do raio do lugar alvo.
- A resposta inclui:
  - Lugar base.
  - Data/hora marcada.
  - Raio usado.
  - Quantidade estimada de pessoas.
  - Quantidade de lugares proximos considerados.
  - Ate 30 participantes.
- `analysisBasis` informa que a estimativa usa votos ativos no dia marcado dentro do raio.

## Grupos

### Criacao de grupo

- Criar grupo exige autenticacao.
- Campos:
  - `name` entre 2 e 80 caracteres.
  - `description` ate 280 caracteres.
  - `privacy`: `PUBLIC` ou `PRIVATE`.
  - `city` e `state` opcionais.
- O criador vira membro `OWNER` com status `ACTIVE`.
- O membro `OWNER` criado junto com o grupo e o lider do grupo.
- O slug e gerado com base no nome mais um sufixo temporal.
- O sistema publica o evento `onde-hoje.group.created`.

### Listagem de grupos publicos

- `GET /groups/public` e publico.
- Retorna apenas grupos com privacidade `PUBLIC`.
- Pode filtrar por cidade.

### Entrada em grupo

- Entrar em grupo exige autenticacao.
- Em grupo publico, a entrada deixa o membro com status `ACTIVE`.
- Em grupo privado, a entrada deixa o membro com status `PENDING`.
- Em grupo privado, o usuario pendente so vira `ACTIVE` apos aprovacao do lider.
- O mesmo par grupo/usuario e unico.
- Reentrar em um grupo atualiza o status conforme a privacidade atual do grupo.
- O sistema publica o evento `onde-hoje.group.member-joined`.

### Aprovacao de membro em grupo privado

- Aprovar membro exige autenticacao.
- Somente o lider do grupo, membro `OWNER` com status `ACTIVE`, pode aprovar solicitacoes.
- A aprovacao muda um membro `PENDING` para `ACTIVE`.
- Se a solicitacao nao existe, a API retorna recurso nao encontrado.
- Se quem tenta aprovar nao e lider, a API retorna erro de permissao.
- Se o membro nao esta pendente, a API retorna conflito.
- O sistema publica o evento `onde-hoje.group.member-accepted`.

## Amizades

- Listar amizades exige autenticacao.
- A lista inclui amizades aceitas e solicitacoes pendentes, enviadas ou recebidas.
- Solicitar amizade exige autenticacao.
- Nao e permitido solicitar amizade para si mesmo.
- Uma solicitacao cria ou atualiza amizade com status `PENDING`.
- Aceitar amizade exige autenticacao.
- A aceitacao busca uma solicitacao onde o outro usuario e o requester e o usuario autenticado e o addressee.
- Ao aceitar, o status muda para `ACCEPTED`.
- Eventos publicados:
  - `onde-hoje.friendship.requested`.
  - `onde-hoje.friendship.accepted`.

## Admin

- O dashboard admin exige autenticacao.
- Apenas usuario com role `ADMIN` acessa o dashboard.
- Usuarios nao admin recebem erro de permissao.
- Metricas retornadas:
  - Total de usuarios.
  - Total de lugares ativos.
  - Total de grupos.
  - Total de votos ativos de hoje.
  - Total de reports abertos.
  - Top lugares por votos de hoje.

## Realtime e Eventos

- Use-cases publicam eventos de dominio para a camada de eventos.
- Eventos existentes cobrem criacao, atualizacao, delecao, autenticacao, votos, grupos e amizades.
- Existe modulo realtime/SSE para emitir eventos.

## Inconsistencias e Melhorias Recomendadas

### Alta prioridade

- Autorizacao de usuarios: endpoints de atualizar e deletar usuario recebem `publicId` e nao verificam se o usuario autenticado e dono da conta ou admin. Recomendacao: exigir `currentUser.sub === publicId` ou role `ADMIN`.
- Listagem de usuarios: qualquer usuario autenticado consegue listar usuarios e ver email/CPF. Recomendacao: restringir a admin ou reduzir campos publicos.
- Amizades direcionais: a constraint unica atual permite A->B e B->A como registros separados. Recomendacao: normalizar pares ou criar chave canonica para impedir duplicidade reversa.
- Solicitacao de amizade pode resetar uma amizade existente para `PENDING` na mesma direcao. Recomendacao: bloquear quando status for `ACCEPTED` ou `BLOCKED`.
- Aceitar amizade usa `update` direto no Prisma; se a solicitacao nao existe, pode estourar excecao em vez de retornar `null`. Recomendacao: usar `updateMany` com contagem ou capturar erro conhecido.
- Votos em grupos privados nao verificam membership ativa. Recomendacao: validar que o usuario e membro `ACTIVE` do grupo antes de votar, ver mapa privado, ranking privado ou historico privado.
- Join em grupo pode transformar membro `BLOCKED` em `ACTIVE` ou `PENDING`. Recomendacao: preservar bloqueio e exigir acao de lider/moderador/admin.

### Media prioridade

- `GET /map/today` com `groupPublicId` invalido cai no mapa publico/global, enquanto `top-places` retorna erro e `history` retorna vazio. Recomendacao: padronizar para erro 404 quando grupo informado nao existe.
- O evento de voto chama `onde-hoje.place.voted-today`, mas agora votos podem ser feitos para qualquer dia. Recomendacao: renomear para `onde-hoje.place.voted` mantendo compatibilidade se necessario.
- A rota antiga `/places/:placePublicId/votes/today` aceita `day` no body. Recomendacao: documentar como compatibilidade ou bloquear `day` nessa rota.
- Ranking `top-places` e mapa de hoje so olham para hoje, mas o sistema agora permite votos futuros. Recomendacao: permitir query `day` tambem no ranking e no mapa.
- Estimativa de presenca sem `groupPublicId` considera votos de todos os escopos, nao apenas publico/global. Recomendacao: decidir se sem grupo deve significar "todos" ou "publico"; se for publico, filtrar `groupId: null`.
- Listagem de grupos usa `_count.members` sem filtrar status e `_count.votes` sem filtrar dia/status, mas presenter chama `todayVotesCount`. Recomendacao: contar apenas membros `ACTIVE` e votos ativos de hoje.
- `HASH_SALT_ROUNDS` existe no env, mas cadastro/atualizacao usam `hash(password, 8)`. Recomendacao: usar `EnvService` ou uma politica central de hashing.
- Login local publica evento de autenticacao, mas nao atualiza `lastLogin`; login Google so atualiza `lastLogin` quando vincula uma conta existente por email. Recomendacao: atualizar `lastLogin` em todo login bem-sucedido.

### Baixa prioridade

- Avatar antigo nao e removido do disco quando uma nova foto e enviada. Recomendacao: agendar limpeza ou remover apos update bem-sucedido.
- A foto e criptografada em repouso, mas a rota publica descriptografa a imagem para qualquer pessoa. Recomendacao: confirmar se avatar publico e desejado; se nao, exigir autenticacao ou signed URLs.
- Google OAuth vincula por email sem checar explicitamente se o email foi verificado pelo provedor. Recomendacao: usar `email_verified` quando disponivel.
- GoogleStrategy so e registrada quando `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` existem, mas as rotas sempre existem. Recomendacao: retornar erro claro quando OAuth nao estiver configurado ou registrar controller condicionalmente.
- Upsert de lugar permite que qualquer usuario autenticado sobrescreva dados de um lugar existente por `googlePlaceId`. Recomendacao: separar criacao de sugestao/curadoria ou registrar auditoria de alteracoes.
- Delete de usuario pode deixar arquivos de avatar criptografados no disco. Recomendacao: remover avatar fisico durante delecao ou job de limpeza.

## Decisoes a Confirmar com Produto

- Um usuario pode votar em ate 3 lugares por dia no total, ou deveria ser 3 por escopo/grupo?
- Voto futuro deve aparecer em ranking/mapa quando `day` for informado?
- Grupo privado deve esconder mapa, ranking e historico de nao membros?
- Avatar deve ser publico ou visivel apenas para usuarios autenticados/amigos?
- Admin pode gerenciar grupos privados, amizades, reports e bloqueios?
- Solicitacao de amizade recusada/cancelada deve existir como status separado?
