# Ideias pro Downpipe

Lista viva do que ainda pode entrar, com o motivo e o tamanho estimado.
Levantada em 25/09/2026, olhando o que o app já tem — cada item aqui já foi
conferido contra o código pra não repetir o que existe.

Tamanho: **P** = dá pra fazer numa sentada · **M** = alguns dias · **G** = semanas.

---

## Em andamento

### 1. Lembrete de rolê por push — P
Hoje o push só sai quando **acontece** alguma coisa: mensagem no chat, mudança
de horário, cancelamento. Ninguém é lembrado na véspera nem no dia. Falta só um
agendador que varra os rolês que começam nas próximas horas e avise quem
confirmou. É o que faz a pessoa aparecer no encontro — e rolê cheio é o que
segura o app.

### 2. Galeria de fotos no post — P/M
O backend já guarda várias mídias por publicação (`post_media`, com `position`),
mas o app mostra só a primeira. Quem vai num rolê tira 20 fotos e hoje tem que
escolher uma ou publicar cinco vezes. É fechar uma lacuna que já está paga do
lado do servidor.

### 4. Manutenção com lembrete — M
Não existe nada disso: modificação é melhoria, não manutenção. Registrar óleo,
correia, pneu, com quilometragem e intervalo, e avisar quando vencer ("faltam
800 km pra troca"). Casa com a ideia de garagem e é a única feature da lista que
a pessoa usa mesmo sem estar a fim de rede social.

---

## Na fila

### 3. Valor FIPE do carro — P
A coluna `fipe_price` já existe no catálogo, preenchida pelo job de
sincronização (`npm run sync:fipe -- --with-prices`). Mostrar "FIPE: R$ 68.400"
na página do carro e, junto com o investido, "você já colocou 27% do valor do
carro em mods". É o tipo de número que essa galera compartilha sozinha —
inclusive na arte de story.

### 5. Rolês perto de mim — M
O app já guarda latitude/longitude e geocodifica endereço, mas descobrir um rolê
ainda depende de alguém mandar o link. Uma lista por proximidade (e um mapa)
transforma o app em lugar onde se procura o que fazer no fim de semana.

### 6. Quem seguir — P/M
O feed já cai no global quando a pessoa não segue ninguém, então o novato não vê
tela vazia. Mas o vínculo não nasce sozinho: sugerir perfis da mesma cidade ou
categoria logo depois do cadastro é barato e muda a retenção da primeira semana.

### 7. Perfil de oficina/loja + anúncio self-service — G
Hoje anúncio entra por linha de comando (`npm run ads`). O caminho natural é um
perfil comercial (oficina, preparador, loja de peças) com serviços e localização,
aparecendo em "perto de mim"; depois, o próprio dono compra o anúncio. É o maior
trabalho da lista e a via de receita que combina com o público.

### 8. Sentry (ou equivalente) — P
Se quebrar em produção hoje, a gente descobre pelo usuário reclamando.

### 9. Suspender conta temporariamente — P/M
Na moderação só existe apagar conteúdo ou excluir a conta inteira, que é
irreversível. Falta o meio-termo: suspensão de alguns dias.

### 10. Banco de desenvolvimento separado — M
Pendente e é o risco mais feio do projeto: todo teste bate na base real. Vale
separar antes de a base crescer.

---

## Com ressalva

### Placa → carro
Preencheria marca/modelo/ano num toque, mas depende de API paga e envolve dado de
terceiro (LGPD). Só com o fluxo restrito ao próprio carro da pessoa.

### Classificados de peças
O público quer, mas traz golpe, disputa e uma carga de moderação que hoje é uma
pessoa só.

### Retrospectiva ("Wrapped")
Parada por decisão do dono do projeto. A base já existe (o desenho da arte em
`utils/arteDeStory.web.ts` e as estatísticas em `utils/montarArte.ts`), então
retomar é mais barato do que parece.
