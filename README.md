# Downpipe — Mobile V1

Rede social para entusiastas de carros: documente o build do seu carro,
acompanhe o projeto e compartilhe com a comunidade. React Native + Expo
Router + TypeScript strict. Consome o backend real (Express + Supabase) —
ver `services/apiService.ts`.

## Como rodar

```bash
npm install --legacy-peer-deps
npx expo start
```

Escaneie o QR code com o app **Expo Go** (SDK 54) no celular, ou pressione `i` / `a`
no terminal para abrir no simulador iOS / emulador Android.

> `--legacy-peer-deps` é necessário porque `lucide-react-native` ainda declara
> React 18 como peer dependency; a lib funciona normalmente em React 19.

Configure `EXPO_PUBLIC_API_URL` no `.env` (veja o arquivo já presente) —
`localhost` só funciona no simulador iOS; em emulador Android ou device
físico, use o IP da máquina rodando o backend.

## Verificações já realizadas

- `npx tsc --noEmit` — 0 erros (TypeScript strict)
- `npx expo export --platform ios` — bundle completo, ~3180 módulos, sem erros

## Estrutura de pastas

```
app/                      rotas (Expo Router)
  login.tsx, register.tsx  Autenticação (Supabase Auth via /auth/*)
  (tabs)/                 Home, Explorar, Garagem, Perfil
  car/[id].tsx             Detalhes do carro
  project/[id].tsx          Detalhes do projeto
  user/[username].tsx       Perfil público de outro usuário
  add-car.tsx               Fluxo por catálogo FIPE (marca → modelo → versão)
  add-post.tsx, add-modification.tsx, add-project-update.tsx
  add-action.tsx            Modal "Selecionar Ação" (botão + central)
components/
  ui/                      Botões, chips, estados, bottom sheet, etc.
  cards/                   CarCard, GarageCard, PostCard, ModificationCard
constants/theme.ts         Tokens de cor/tipografia/espaçamento (de DESIGN.md)
types/                     Tipos de domínio (User, Car, Project, Post, ...) —
                            espelham o schema real do backend, não mocks
services/
  api.ts                   Cliente HTTP fino (envelope {data,pagination,error},
                            multipart, token de auth)
  authService.ts            /auth/register, /auth/login, /auth/logout
  apiService.ts              Todo o resto — cars, posts, feed, mods, projetos,
                              follows, likes, comentários, anúncios, catálogo
                              de veículos
stores/                    Hooks React Query (useMutation/useQuery) por
                            domínio — não guardam mais estado local; o cache
                            do React Query é a única fonte de verdade dos
                            dados do servidor
utils/car.ts                carTitle()/carYear() — carro só tem marca/modelo/
                             ano quando linkado ao catálogo (vehicleVersionId)
```

## Telas implementadas

- **Login/Cadastro** — `POST /auth/login` e `/auth/register`, sessão
  persistida em `expo-secure-store` (localStorage no web).
- **Home** — feed real (`GET /feed`, paginado + anúncios intercalados),
  curtir (otimista), comentar (bottom sheet paginado), pull-to-refresh.
- **Explorar** — categoria filtrada no servidor e busca via `GET /search`
  (acha por marca, modelo, nome do carro e também pessoas).
- **Adicionar carro** — fluxo por catálogo FIPE: marca → modelo → versão/ano
  (`GET /vehicles/*`, populado sob demanda pelo backend quando a marca/
  modelo ainda não está na base própria), com opção de continuar sem
  catálogo (só texto livre).
- **Garagem** — `GET /profiles/:username/cars` do próprio usuário, criar/
  editar/excluir de verdade.
- **Detalhes do carro** — motor/potência/km reais, modificações do carro,
  link pro projeto.
- **Projeto** — criar/editar (metas de potência e orçamento) e timeline de
  etapas — `budgetSpent`/`modificationsDone`/`amountInvested`/
  `projectProgress` são recalculados pelo backend, nunca pelo app.
- **Perfil** (próprio e de terceiros) — stats reais, seguir/deixar de
  seguir (otimista), garagem e publicações do usuário.

## O que fica de fora por enquanto (limitações conhecidas)

- **"Salvar" post**: sem endpoint no backend — vira estado local do
  componente, não persiste.
- **Galeria multi-imagem em post**: backend aceita várias mídias por post
  (`POST /posts` com até 10 arquivos), o app só mostra a primeira.
- **Notificações** (`/notifications`): backend pronto, sem tela ainda.
