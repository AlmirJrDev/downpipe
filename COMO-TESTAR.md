# Como deixar o app disponível pra outras pessoas testarem

Setup de demo: o backend roda na sua máquina e é exposto pela internet via
ngrok; o app é servido pelo Expo e aberto no **Expo Go** do testador. Serve
pra sessões de teste de algumas horas — **seu computador precisa ficar
ligado** com os três processos abaixo rodando.

## Você (uma vez por sessão)

Precisa de 3 terminais abertos ao mesmo tempo.

**1. Backend** (na pasta `gearhead-backend-completo`):

```bash
npm run dev
```

**2. Túnel do backend** (qualquer pasta):

```bash
ngrok http 3000
```

> Primeira vez: crie a conta grátis em https://ngrok.com, instale, e rode
> `ngrok config add-authtoken SEU_TOKEN`. Sem isso o ngrok não sobe.

**3. App** (na pasta `projeto-c`):

```bash
npm run share
```

Se a porta 8081 estiver ocupada, passe outra — **use este parâmetro em vez de
trocar a porta na mão**, porque é por ela que o script identifica o túnel do
app e atualiza a página de status:

```bash
npm run share -- --port=8082
```

Esse comando lê a URL pública do ngrok, grava em `EXPO_PUBLIC_API_URL` no
`.env` e sobe o Expo com tunnel. Ele avisa se o ngrok não estiver rodando ou
se o backend não responder — não deixa você descobrir isso pelo celular do
testador.

## O link único pros testadores

Em vez de mandar QR code novo a cada sessão, mande sempre o **mesmo link**:

```
https://SEU-DOMINIO.ngrok-free.dev/status
```

Essa página é servida pelo próprio backend e mostra:

- **ONLINE / OFFLINE** — se o app está no ar naquele momento
- **QR code** e botão "Abrir no Expo Go" quando está online
- Instruções de como testar

O `npm run share` publica a URL do Expo nessa página automaticamente ao subir,
e a marca como offline quando você encerra com Ctrl+C. A página se atualiza
sozinha a cada 30 segundos, então quem deixar a aba aberta esperando vê o
momento em que você sobe o ambiente.

> Para o link ser sempre o mesmo, use o **domínio estático** do ngrok (o plano
> grátis dá um por conta): `ngrok http 3000 --url=seu-dominio.ngrok-free.dev`.
> Sem ele a URL muda a cada reinício e o link da página muda junto.

## O testador

1. Instalar **Expo Go** (App Store / Play Store).
2. Android: abrir o Expo Go e escanear o QR. iPhone: escanear com a câmera
   nativa, que abre no Expo Go.
3. Criar uma conta no app com e-mail e senha (confirmação de e-mail está
   desligada, então entra na hora).

Não precisa estar na mesma rede que você — o tunnel resolve isso.

## Pontos de atenção

- **Notebook ligado**: se você fechar o terminal do Expo ou do ngrok, o app
  para de funcionar pra todo mundo na hora.
- **URL do ngrok muda**: no plano grátis, cada reinício do ngrok gera uma URL
  nova. Se reiniciar, rode `npm run share` de novo (ele reescreve o `.env`) e
  peça pros testadores reabrirem o app.
- **`EXPO_PUBLIC_API_URL` é embutido no bundle** quando o Expo inicia. Trocar
  o `.env` com o Expo já rodando não tem efeito — por isso o `npm run share`
  sempre sobe com `-c` (limpa o cache do Metro).
- **Dados são compartilhados**: todo mundo cai no mesmo banco Supabase, então
  os testadores veem os carros e posts uns dos outros. Pra demo isso costuma
  ser bom (o feed não fica vazio), mas não é um ambiente isolado.
- **Contas de teste ficam no banco**: não existe endpoint de apagar conta;
  pra limpar depois, use o painel do Supabase (Authentication → Users).

## Quando isso deixar de ser suficiente

Se quiser que testem ao longo de dias sem depender da sua máquina, o próximo
passo é hospedar o backend (Railway/Render têm plano grátis — ele já tem
`build`/`start` e lê `PORT` do ambiente) e gerar um APK pelo EAS Build. Aí o
testador instala uma vez e usa quando quiser.
