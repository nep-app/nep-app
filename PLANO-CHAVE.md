# Plano: chave própria do cofre (resolve S-01 e S-02)

Estado: **escrito, não começado.** Decidido em 27-09-2026.

Objectivo, numa frase: **hoje, ler um documento do Firestore chega para descobrir
tudo. Depois disto, é preciso ter o telemóvel na mão.**

---

## Porque é que o PIN não chega hoje

O PIN de 4 dígitos **é** a chave do cofre: é dele que se deriva a chave que cifra
tudo. E o servidor guarda o `salt`, mais milhares de registos cifrados.

Quem consiga ler qualquer um desses registos leva-o para casa com o salt e
experimenta as 10.000 combinações no computador dele, sem ninguém a contar as
tentativas. Minutos.

No banco, 4 dígitos chegam porque há um porteiro: ou o servidor verifica e
bloqueia à terceira, ou a chave está no hardware seguro do telemóvel, que também
conta. Aqui não há porteiro **de propósito** — se o servidor pudesse verificar o
PIN, podia ler os dados. É o preço de não poder ler nada.

Ver `SEGURANCA.md`, S-01 e S-02.

## O que NÃO resolve

- **PIN de 6 dígitos.** 10 mil → 1 milhão. Continua a ser horas. Teatro.
- **Subir as iterações do PBKDF2** (100 mil → 600 mil). Quadruplica o trabalho
  contra 10 mil hipóteses, e obriga a migrar toda a gente. Teatro.
- **Tirar o `pinVerification` e o `_system/validation` do servidor.** Foi a
  correcção proposta na revisão externa. Não chega: com o salt, **qualquer
  registo cifrado** serve de alvo, e esses estão todos no Firestore por design.

---

## A forma nova

Três peças em vez de uma:

1. **Chave-mestra** — 256 bits aleatórios, gerada no aparelho. É ela que cifra
   tudo. Não se deriva de nada que a pessoa saiba, por isso não se adivinha.
2. **Cópia na nuvem, fechada pela frase-passe.** A chave-mestra sobe cifrada com
   uma chave derivada da frase-passe. A frase escreve-se **uma vez por
   aparelho**, na configuração — nunca no dia-a-dia. Com entropia a sério, a
   força bruta deixa de ser possível mesmo com o salt na nuvem, e a recuperação
   entre aparelhos continua a funcionar.
3. **Cópia local, fechada pelo PIN.** A mesma chave-mestra fica no aparelho,
   cifrada com o PIN. O PIN continua a ser 4 dígitos, 15 vezes por dia, como
   agora — mas passa a abrir só a gaveta local. **Esta cópia nunca sai do
   telemóvel.**

O que muda no ataque: sem a cópia local, ter o servidor não chega. É preciso o
aparelho.

### De borla, duas coisas

- A chave-mestra pode viver no IndexedDB como `CryptoKey` **não extraível** — o
  próprio browser não a consegue exportar. É isso que fecha o S-02 (hoje guarda-se
  o PIN em texto, com `btoa`, que é codificação e não cifra).
- Com a chave já não derivada do PIN, dá para pôr um **limite de tentativas**: N
  erros e a gaveta local fecha-se, é preciso a frase-passe. Passa a haver
  porteiro, como no banco.

---

## Por onde começar (ordem sugerida)

1. Gerar e guardar a chave-mestra; cifrar com ela em vez do PIN. Compatibilidade
   para trás obrigatória — quem já tem dados cifrados com a chave do PIN tem de
   continuar a lê-los.
2. Ligar a frase-passe (já está construída, falta ligar) e subir a chave-mestra
   cifrada com ela.
3. Passar o PIN a gaveta local, com limite de tentativas.
4. Migração de quem já usa a app, que tem de correr uma vez, sem perder nada e
   sem exigir nada à pessoa além de definir a frase-passe.
5. Só depois: deixar de subir o `pinVerification` e o `_system/validation`.

## Riscos, ditos com todas as letras

- **Mexe no login e na sincronização ao mesmo tempo.** São as duas partes onde um
  erro não dá erro visível — dá dados irrecuperáveis.
- **A migração é a parte perigosa**, não o código novo. Tem de ser reversível e
  testada com uma cópia real dos dados antes de chegar a alguém.
- Testar em recarregamento real da página com PIN, não em reinstalação da PWA
  (ver `CLAUDE.md`).
- **Não fazer isto com um prazo em cima.**

## Fica em aberto

**Biometria / passkey** como terceira forma de abrir a gaveta. Dá a conveniência
do PIN com o porteiro do hardware. Mas biometria é mais fácil de obrigar alguém a
dar do que uma frase decorada — para esta população isso não é detalhe. A
resposta pertence ao modelo de ameaça, que ainda não está escrito.
