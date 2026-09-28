# Plano: a app poder dizer "isto não se distingue do acaso"

Estado: **escrito, não começado.** Decidido em 28-09-2026.

Regra que manda nisto tudo:

> **A app pode dizer "isto não se distingue do acaso", e tem de o poder dizer
> antes de poder dizer o contrário. Uma ferramenta que só sabe afirmar é uma
> ferramenta que só sabe convencer.**

É a regra das metas noutra forma: a app não pode ter mais confiança do que os
dados dela têm.

---

## O que existe hoje

- `analyticsService.js` tem **uma única função estatística**:
  `calculatePearsonCorrelation`. Devolve só o `r`.
- Guarda mínima: `if (clean.length < 3) return null`. **Três pontos.**
- **Zero p-values** em todo o `src`. Nenhuma medida de incerteza, em lado nenhum.
- A tab das Correlações chama o Pearson **31 vezes** e mostra tudo ao mesmo tempo.
- Não existe correlação parcial nem regressão múltipla (procurado por *partial*,
  *parcial*, *controlando*, *regress*: nada).

## Porque é que isto importa

A app consegue dizer "mg × sono dá −0,38" e "consumos × sono dá −0,61". Duas
correlações lado a lado **não respondem à pergunta**, porque as duas variáveis
andam juntas (r = 0,45 entre elas nos dados reais). Só a parcial separa. Nos
dados de 28-09-2026:

| | r parcial | p |
| --- | --- | --- |
| mg × sono, com os toques fixos | −0,126 | 0,33 |
| toques × sono, com os mg fixos | −0,528 | 6,5×10⁻⁶ |

Ou seja: **em noites de pouco sono, usa-se mais vezes — não doses maiores.**
Sem a parcial, lê-se "a dose também conta, só que menos", e isso é falso.

---

## A ordem (não trocar)

### 1. O ecrã primeiro

Reduzir as 31 correlações simultâneas a uma pergunta de cada vez, escolhida pela
pessoa.

**Porquê primeiro:** com 31 correlações à vista e um p em cada uma, ao nível
habitual de 5% esperam-se **1 a 2 "significativas" só por acaso**, mesmo sem
relação nenhuma nos dados — e vão ser as que saltam à vista, porque foram as
que se destacaram. Pôr o p antes de arrumar o ecrã dá carimbo de autoridade a
falsos achados em vez de os travar. Arrumar primeiro faz com que o p, quando
chegar, esteja a responder a **uma** pergunta escolhida.

### 2. O n mínimo

`n < 3` é indefensável. E para a parcial o n não é o comprimento das séries: é
o número de **dias completos nas três variáveis** (listwise). Nos dados reais
são **63**, não 192.

### 3. O p por permutação — não pela distribuição t

Baralhar os dias alguns milhares de vezes e contar quantas vezes o acaso dá um
número tão forte como o observado.

**Porquê permutação:** a via clássica precisa da distribuição t, ou seja da
função beta incompleta — ~30 linhas que ninguém verifica a olho. A permutação
são ~10 linhas sem funções especiais e, sobretudo, **explica-se em português**:

> "Baralhámos os teus dias 5000 vezes. Em 33% delas o acaso deu um número tão
> forte como este. Não se distingue do acaso."

**Contar sempre `(b+1)/(m+1)`.** Com 5000 baralhações e zero acertos, o que se
pode dizer é **"menos de 1 em 5000"**, nunca "zero". Uma app que diz zero está a
prometer uma certeza que o método não dá — é a mesma família do "75%
probabilidade" que foi removido na v6.51.0.

### 4. A parcial — com Freedman–Lane

A fórmula da parcial são três linhas:

```
r(xy·z) = (rxy − rxz·ryz) / √((1−rxz²)(1−ryz²))
```

**Mas para o p da parcial, baralhar ao calhas está ERRADO.** Se se baralha y,
destrói-se a relação dele com z **e** com x ao mesmo tempo. A distribuição nula
que sai é "não há relação nenhuma", quando a pergunta é "não há relação **para
além de z**". O p sai pequeno de mais — e com ar de rigor, que é o pior.

Freedman–Lane:

```
1. regride y sobre z            → guarda ajustado + resíduos
2. baralha SÓ os resíduos
3. y* = ajustado + resíduos baralhados
4. calcula a parcial de x e y* controlando z
5. repete m vezes
```

Só se baralha a parte de y que z não explica — que é exactamente a hipótese
nula certa.

---

## Encontrado ao escrever isto (corrigir ao fazer o ponto 1)

`AnalysesCorrelacoesTab.jsx:157` — a secção "entre dias" (sono de ontem →
consumo de hoje) faz:

```js
const today = sortedDates[i];
const tomorrow = sortedDates[i + 1];
```

`sortedDates` são as datas **que têm dados**, não os dias do calendário. Se
houver um buraco de uma semana, `i + 1` é uma semana depois e continua a ser
tratado como "o dia seguinte". Com 108 dos 317 dias sem valor de mg, isto não é
hipotético.

**Tem de verificar que as duas datas são mesmo consecutivas** antes de formar o
par.

---

## O que isto responde — e o que não responde

**Responde sobre o PASSADO.** Uma parcial descreve o que está registado. Não é
uma previsão, e a app não deve apresentá-la como tal.

**Não estabelece direcção.** O achado dos −0,528 é do **mesmo dia**: a noite e
os toques desse dia. "Dormi mal, usei mais" e "usei mais, dormi mal" explicam
os dois o mesmo número. A pergunta "o que vem primeiro" só se responde com a
versão desfasada (sono de ontem → consumos de hoje, contra consumos de hoje →
sono desta noite), e essa é uma conta diferente — a que está no ponto anterior,
com o bug dos dias não consecutivos.

**Fica útil para a frente** apenas na medida em que o padrão seja estável e a
direcção esteja estabelecida. Até lá, é conhecimento sobre o que aconteceu —
que já é muito — e não sobre o que vai acontecer.
