# Névoa Cifras

App de cifras parecido com o Cifra Club, com visual escuro e mobile-first. Busque uma música, veja a cifra com acordes sobre a palavra certa, transporte de tom, capotraste, afinação, rolagem automática e monte **listas/setlists** e **favoritos** na sua conta. Cada música tem as versões **Original** e **Simplificada** (quando existir no Cifra Club) e dá para **compartilhar, imprimir e baixar** a cifra como texto.

- **Frontend:** Vite + React (estático, roda no GitHub Pages)
- **Backend/dados:** Supabase (Auth + Postgres + Edge Functions)
- **Busca de cifras:** Edge Function `fetch-song` raspa a página pública do Cifra Club, salva no banco e nas próximas buscas responde do catálogo (compartilhado entre usuários).

```
┌──────────────┐   busca  ┌────────────────────────┐   HTTP   ┌──────────────┐
│ GitHub Pages │ ───────► │ Supabase Edge Function │ ───────► │ Cifra Club   │
│ (React SPA)  │          │      fetch-song        │   (HTML) │ (página da   │
│              │ ◄─────── │  raspa + salva no DB   │          │  música)     │
└──────────────┘          └────────────────────────┘          └──────────────┘
        │ catálogo/listas/favoritos/login
        ▼
  Supabase (Postgres + Auth, com RLS)
```

> **Aviso:** o Cifra Club pode bloquear acessos vindos de servidores em nuvem ou mudar o HTML. Se a busca quebrar no futuro, o resto do app (listas, favoritos, catálogo) continua funcionando. Uso pessoal, sem republicar conteúdo do Cifra Club.

---

## Estrutura

```
src/                    # Frontend React
  lib/                  # supabase, transposição, parser de acordes, store
  components/           # CifraView, ChordDiagram, SongCard, Icons
  pages/                # Home, Song, Lists, ListDetail, Favorites, Auth, Profile
supabase/
  schema.sql            # Rode no SQL Editor do Supabase
  functions/fetch-song/ # Edge Function que busca e salva a cifra
.github/workflows/      # Build + deploy para GitHub Pages
```

---

## Passo a passo de configuração

Você precisa de: um projeto no **Supabase**, um repositório no **GitHub** e (só para publicar a Edge Function) o **Supabase CLI**.

### 1. Banco de dados

1. Abra seu projeto no [Supabase Dashboard](https://supabase.com/dashboard) → **SQL Editor**.
2. Cole todo o conteúdo de `supabase/schema.sql` e execute.

Isso cria as tabelas `profiles`, `songs`, `lists`, `list_songs`, `favorites`, os triggers de perfil e os RPCs (`username_available`, `get_email_for_username`, `swap_list_positions`).

> **Upgrade:** o `schema.sql` é idempotente. Se você já rodou uma versão antiga, execute-o de novo — ele adiciona a coluna `version` em `songs` e ajusta a unicidade para permitir as versões Original e Simplificada da mesma música.

### 2. Autenticação (email + senha)

1. **Authentication → Providers** → confirme que **Email** está habilitado.
2. Em **Authentication → URL Configuration**:
   - **Site URL:** seu endereço do Pages, ex. `https://SEU_USUARIO.github.io/nevoa-cifras/`
   - **Redirect URLs:** adicione o mesmo endereço acima (para o link de confirmação de e-mail voltar ao app).
3. Em **Authentication → Settings**: "Confirm email" como preferir (ligado exige confirmar e-mail no primeiro acesso).

> O nome de usuário é criado no cadastro e validado por trigger. Dá para **entrar com e-mail OU com nome de usuário**.

### 3. Edge Function `fetch-song`

A função precisa da chave `service_role` (fica **só** no servidor, nunca no frontend).

1. Instale o CLI do Supabase: `npm i -g supabase` (ou `brew install supabase/tap/supabase`).
2. Na pasta do projeto:
   ```bash
   supabase login
   supabase link --project-ref luguppodlfqnnmnwooar
   ```
3. Defina o secret com a **service_role key** (Dashboard → Settings → API → `service_role`):
   ```bash
   supabase secrets set SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY --project-ref luguppodlfqnnmnwooar
   ```
4. Publique a função:
   ```bash
   supabase functions deploy fetch-song --project-ref luguppodlfqnnmnwooar
   ```
5. Teste:
   ```bash
   curl -X POST https://luguppodlfqnnmnwooar.supabase.co/functions/v1/fetch-song \
     -H 'Content-Type: application/json' \
     -H "Authorization: Bearer SUA_ANON_KEY" \
     -d '{"artist":"Coldplay","title":"The Scientist"}'
   ```
   Na primeira vez retorna `"source":"scraped"`; nas próximas, `"source":"cache"`.

### 4. Rodando localmente (desenvolvimento)

1. Crie o arquivo `.env` copiando o `.env.example` e preencha URL e anon key:
   ```bash
   cp .env.example .env
   ```
2. Instale e rode:
   ```bash
   npm install
   npm run dev
   ```
   Abra http://localhost:5173

> A anon key é pública por design e vai no frontend. A `service_role` NUNCA deve entrar no frontend nem no GitHub.

### 5. Publicar no GitHub Pages

1. Crie um repositório (ex.: `nevoa-cifras`) e envie este código para a branch `main`.
2. No repositório → **Settings → Secrets and variables → Actions**, adicione:
   | Nome | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://luguppodlfqnnmnwooar.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | sua anon key |
   | `VITE_EDGE_FUNCTION_URL` | `https://luguppodlfqnnmnwooar.supabase.co/functions/v1/fetch-song` |
3. Em **Settings → Pages**: Source = **GitHub Actions**.
4. O workflow `.github/workflows/deploy.yml` faz o build e publica automaticamente a cada `push` na `main`.

Seu site fica em `https://SEU_USUARIO.github.io/nevoa-cifras/`.

> Lembre-se de voltar ao **passo 2** e atualizar Site URL / Redirect URLs com o endereço final do Pages.

---

## Usando o app

- **Buscar**: digite artista + música. Se ainda não estiver no catálogo, o app busca no Cifra Club e salva.
- **Na cifra**:
  - **Tom** e **Capo** mudam os acordes exibidos (com capotraste, os acordes descem para soar no tom original).
  - **Auto-scroll** rola a página sozinha; ajuste a velocidade e o tamanho da letra.
  - Toque em **qualquer acorde** para ver o diagrama em **Violão, Guitarra ou Teclado**.
  - Botão **YouTube** abre o vídeo (ou a busca) no app do YouTube.
  - Modo **tela cheia** para tocar sem distração.
- **Listas**: crie setlists e adicione músicas pelo `+` na página da cifra. Reordene com as setas.
- **Favoritos**: coração na página da cifra.

## Funcionalidades planejadas

- Login com Google
- Listas públicas/compartilháveis
- Modo "palco" navegando pela setlist
- Impressão/PDF
- Cadastro de cifra manual quando a busca falhar

## Solução de problemas

| Problema | Causa provável / solução |
|---|---|
| A busca dá "Configure SERVICE_ROLE_KEY" | Secret da função não definido (passo 3). |
| A busca diz que não achou a música | Slug errado ou Cifra Club bloqueando o servidor. Confira o nome e tente de novo. |
| Cadastro diz erro genérico ao salvar usuário | Nome de usuário duplicado (trigger) — teste com outro nome. |
| Login com nome de usuário falha | O trigger criou o perfil? Confira a tabela `profiles` no Dashboard. |
| Página em branco no Pages | Confira os secrets no Actions e o resultado do workflow. |
