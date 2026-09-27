# Segurança — falhas conhecidas

Lista pública das falhas conhecidas da NEP.app, com datas. Está aqui porque uma
app que guarda dados de consumo de pessoas que usam drogas não pode pedir
confiança sem dizer o que ainda não está resolvido.

**Isto não é uma auditoria.** Nada nesta lista foi verificado por terceiros. O
que aqui está veio de leitura de código, não de testes de intrusão. Não
encontrar mais não quer dizer que não haja mais.

Última revisão: **27-09-2026**

---

## Em aberto

### S-01 · Quem consiga ler um documento do Firestore pode adivinhar o PIN sem limite
**Gravidade: alta · Aberta desde sempre · Detectada em 27-09-2026**

O PIN tem 4 dígitos: são 10.000 combinações. O servidor guarda, por utilizador:

- `users/{uid}/settings/encryption` → o `salt` e o `pinVerification`
- `users/{uid}/_system/validation` → o `salt` **e** um bloco cifrado cujo texto
  original é uma constante pública do código-fonte

Qualquer um destes documentos chega para testar as 10.000 hipóteses **offline**,
sem passar pela app e sem nada que trave as tentativas. O AES-GCM é autenticado,
por isso cada tentativa dá um sim/não limpo. Com 100.000 iterações de PBKDF2 por
tentativa, isso é trabalho de minutos num portátil.

Quem consegue ler um destes documentos: a Google, um pedido legal à Google, uma
conta Firebase comprometida, ou a service account de administrador usada pelo
GitHub Actions (ver S-03).

**Consequência honesta:** para quem usa PIN, a cifra ponta-a-ponta não resiste a
quem tenha acesso de leitura ao Firestore.

**Porque não está corrigida já:** o `salt` na nuvem é o que permite recuperar os
dados noutro aparelho. Tirá-lo fecha esta porta e fecha a recuperação. É uma
decisão de produto, não técnica, e está por tomar.

**Caminho:** deixar de subir o `pinVerification` e o `_system/validation`
(guardá-los só no aparelho) e passar a passphrase — que já está construída e não
está ligada — a opção recomendada.

---

### S-02 · O PIN fica legível no armazenamento do browser
**Gravidade: alta · Aberta desde sempre · Detectada em 27-09-2026**

No modo "nunca bloquear", o PIN é guardado em `localStorage` com `btoa()`, que é
codificação e não cifra — sobrevive ao fecho do browser e lê-se em texto. Nos
restantes modos (excepto "bloquear ao esconder") fica igualmente legível em
`sessionStorage`, que pelo menos morre ao fechar o separador.

Quem tenha o aparelho desbloqueado na mão, ou qualquer XSS na app, lê o PIN.

**Caminho:** guardar uma `CryptoKey` não extraível no IndexedDB em vez do PIN em
texto. Implica refactor: o PIN circula hoje como *string* por toda a app.

---

### S-03 · A service account dos lembretes pode ler o projecto inteiro
**Gravidade: média · Mitigada em parte em 27-09-2026**

O envio de lembretes corre num GitHub Action com credenciais de administrador,
que **ignoram as regras do Firestore**. Precisa das preferências de lembretes,
mas pode ler tudo — incluindo os documentos do S-01, de todos os utilizadores.

**Feito em 27-09-2026:** as preferências passaram de `users/{uid}/push/prefs`
para a colecção de topo `pushPrefs/{uid}`. O carteiro deixa de ter motivo para
entrar na árvore dos utilizadores.

**Continua em aberto:** isto tira o motivo, não a capacidade. O IAM do Firestore
não permite restringir uma credencial a uma colecção. O que reduz mesmo o valor
deste segredo é resolver o S-01.

---

### S-04 · Os dados de investigação são pseudonimizados, não anónimos
**Gravidade: baixa · Aberta · Detectada em 27-09-2026**

Cada contribuição vai com um identificador aleatório estável, semana após
semana, durante meses. Não identifica ninguém sozinho, mas é uma série
longitudinal ligada a um identificador fixo — é pseudonimização, não anonimato.
A interface ainda lhe chama "anónimo".

**Caminho:** corrigir a palavra na interface e no consentimento.

---

### S-05 · Uma conta autenticada pode escrever sob outro identificador de investigação
**Gravidade: baixa · Mitigada em parte em 27-09-2026**

As regras não conseguem, ao mesmo tempo, impedir isto **e** manter o
identificador desligado da conta Firebase — amarrá-lo ao `uid` ligava cada linha
de investigação à conta da pessoa, que é exactamente o que o identificador
existe para evitar.

Como o identificador é aleatório e longo, ninguém consegue **adivinhar** o de
outra pessoa: o risco real não é contaminar alguém em concreto, é poluir o
conjunto com participantes inventados.

**Feito em 27-09-2026:** forma e tamanho do identificador validados, só
documentos de semana, tecto no número de campos, leitura e eliminação
bloqueadas. Antes, qualquer conta autenticada podia criar qualquer caminho sob
`/research` e guardar lá o que quisesse. O gerador de identificadores deixou de
poder cair no `Math.random()` (que não é aleatoriedade criptográfica).

---

### S-07 · Dependências com vulnerabilidades conhecidas
**Gravidade: baixa na app, por avaliar no CI · Aberta · 27-09-2026**

`npm audit` acusa 14 vulnerabilidades em dependências de produção (2 críticas,
2 altas). **Nenhuma chega ao browser**: são caminhos de Node do SDK do Firebase
(`@grpc/grpc-js`, `protobufjs`, `undici`, `websocket-driver`) que o Vite remove
do bundle — verificado no build.

Ficam por resolver duas coisas: `npm audit fix` falha com um erro interno do npm
neste lockfile, e a correcção real é subir o `firebase` de 10 para 12, um salto
de versão maior que mexe em autenticação, base de dados e notificações — tem de
ser uma alteração à parte, testada com login por PIN e recarregamento real.

O script dos lembretes instala `firebase-admin@12` no CI sem lockfile, por isso
não está coberto por esta análise.

---

## Corrigidas

### S-06 · Apagar não apagava no servidor
**Corrigida em 27-09-2026 · Detectada em 27-09-2026**

Apagar um registo nunca removia o documento do Firestore: escrevia uma "lápide"
com `deleted: true` que **continuava a transportar o envelope cifrado** do
registo. O conteúdo do que a pessoa apagou ficava no servidor indefinidamente,
enquanto a app dizia que tinha sido apagado.

A lápide passa a levar só o identificador, a data e a marca de apagado. O
conteúdo sai do servidor.

**Nota:** isto vale para o que for apagado a partir desta versão. As lápides
antigas continuam com conteúdo até serem reescritas ou limpas à mão.

---

### S-08 · O PIN ficava em texto na cache da chave
**Corrigida em 27-09-2026 · Detectada em 27-09-2026**

A cache da chave derivada usava `${pin}:${salt}` como identificador, o que
deixava o PIN em texto numa variável durante toda a sessão. Passou a usar um
hash SHA-256 do par.

---

## O que ainda não existe

Dois documentos que deviam acompanhar esta lista e ainda não estão escritos:

- **Modelo de ameaça** — de quem é que esta app protege, e de quem não protege.
- **O que acontece aos registos quando o projecto parar.** Um mantenedor é um
  ponto de falha único.
