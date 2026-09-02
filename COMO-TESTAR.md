# Como deixar o app disponível pra outras pessoas testarem

Manda o link:

**https://downpipe.onrender.com**

Só isso. O backend e o app estão hospedados no Render — não depende da sua
máquina estar ligada, não precisa de ngrok, de Expo Go nem de QR code.

## O que a pessoa faz

1. Abre o link no celular.
2. Cria uma conta com e-mail e senha (a confirmação de e-mail está
   desligada, então entra na hora).
3. Se quiser o ícone na tela inicial: **iPhone** → botão de compartilhar →
   "Adicionar à Tela de Início"; **Android** → menu do Chrome → "Instalar
   app". Aí abre em tela cheia, sem a barra do navegador.

Funciona no computador também, num formato de telefone centralizado.

## A primeira visita pode demorar

O plano grátis do Render hiberna o serviço depois de ~15 minutos sem
ninguém acessando, e acordar leva perto de um minuto. Quem clicar nesse
intervalo vê uma tela de "waking up" da própria Render antes da página.

Duas coisas atenuam, nenhuma resolve de vez:

- a landing do GitHub Pages abre na hora e dispara um ping que acorda o
  backend enquanto a pessoa lê;
- um workflow agendado pinga o serviço — mas o agendador do GitHub Actions
  é best-effort e frequentemente pula execuções, então não conte com ele.

**Se a primeira impressão importa** (divulgação, demonstração marcada), abra
o link você mesmo um minuto antes. A saída definitiva é o plano pago do
Render, que não hiberna.

## Um aviso que importa

**Não existe ambiente de teste separado.** O app tem um único banco
Supabase, então quem entra por esse link está escrevendo no banco de
produção, junto com os usuários de verdade. Na prática:

- todo mundo vê os carros, posts e rolês de todo mundo — o que é bom pra
  demonstrar (o feed não fica vazio) e ruim pra bagunçar à vontade;
- conta de teste é conta real, e continua lá depois;
- **não existe endpoint de apagar conta.** Pra limpar, use o painel do
  Supabase em Authentication → Users.

Se um dia isso incomodar, o caminho é um segundo projeto Supabase e um
segundo serviço no Render apontando pra ele.

## Rodando na sua máquina (desenvolvimento)

**Backend** (pasta do `downpipe-bk`):

```bash
npm run dev
```

**App** (pasta do `downpipe`):

```bash
npm run web
```

O app na web fala com a própria origem que serviu a página. Pra apontar o
app local pro backend local, o backend serve o PWA a partir da pasta `web/`
— gere com `npm run build:web` no app e abra `http://localhost:3000/app/`.

Existe também um `npm run share`, do tempo em que o teste era por ngrok +
Expo Go. Não faz parte do fluxo atual e não foi testado desde então.

## Como o que você mexe chega no ar

- **Backend**: `git push` no `downpipe-bk` → o Render redeploya sozinho.
- **App**: `npm run build:web` copia o resultado pra pasta `web/` do
  backend; daí é commit e push nos dois repositórios. Existe um workflow
  que faria isso sozinho a cada push, mas ele depende de um secret
  `BACKEND_TOKEN` que ainda não foi criado.
