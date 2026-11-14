# Investigação: que perguntas estes dados conseguem responder

Estado: **rascunho para discutir** (14-11-2026), sobretudo com os focus groups.
Princípio: **primeiro as perguntas, depois o que se recolhe.** Recolher sem
pergunta definida vai contra a minimização de dados (RGPD, art. 5.º, n.º 1, c)
e contra a ideia de dados governados por quem os gera.

---

## O que existe hoje (modo "Cloud + Investigação", opcional)

Uma **ficha por pessoa e por semana**, calculada no telemóvel, sem texto e sem
sentimento, ligada a um código aleatório (pseudónimo, não anónimo: as semanas
da mesma pessoa ficam ligadas entre si).

| Campo | O que é |
| --- | --- |
| consumos | nº de consumos, dias com consumo, consumos por parte do dia |
| mg | total e média por consumo — **só quando há medição** |
| sono | nº de ciclos, horas médias, hora média de deitar (média de relógio desde 14-11-2026), gatilhos |
| bem-estar | nº de registos, humor e energia médios, contagem de emoções (as da lista da app) |
| metas | que tipos de meta a pessoa tem |

O ecrã **Config → 🔬 Investigação** (só a conta da investigadora) mostra
participação e qualidade dos dados, e descarrega tudo em CSV.

## Perguntas que estes dados CONSEGUEM responder

Todas "dentro da mesma pessoa" (a pessoa comparada com ela própria noutras
semanas), que é o que tem interesse; comparar pessoas entre si confunde tudo o
que as distingue. Análise fora da app, com modelos mistos (ex.: R, `lme4`),
uma linha por pessoa-semana.

1. **Sono e consumo, semana a semana.** Nas semanas em que uma pessoa dorme
   menos (ou se deita mais tarde), consome mais vezes do que nas outras
   semanas dela? E mais mg? (Uma análise anterior aos dados **diários** da
   Teresa — ver PLANO-ESTATISTICA.md — sugeriu que o sono anda mais com o
   **número de vezes** do que com a dose. É uma pessoa e são dias, não semanas:
   fica como hipótese a confirmar.)
2. **Humor e energia.** As semanas com mais consumos são semanas com humor ou
   energia médios diferentes, na mesma pessoa?
3. **Quando no dia.** A parte do dia em que se consome (manhã/tarde/noite/
   madrugada) muda com o sono dessa semana?
4. **Metas.** Depois de uma pessoa criar uma meta, os números dela mudam?
   ⚠️ Só descritivo: quem cria uma meta já estava a mudar, por isso não se
   pode dizer que foi a meta.
5. **Participação.** Quem fica e quem sai, ao fim de quantas semanas. Útil
   para desenho e para a candidatura.
6. **Qualidade.** Que campos as pessoas preenchem de facto (sono? humor? mg?).
   Diz o que vale a pena perguntar e o que é peso morto.

## Perguntas que estes dados NÃO conseguem responder

- **"Dormir mal no dia X leva a consumir mais no dia X+1."** Fichas semanais
  não têm dias. Para isso seriam precisos dados por dia, muito mais fáceis de
  reidentificar (padrões de horário são quase uma impressão digital).
- **Causas.** Nada disto é experimental: diz o que anda junto, não o que causa.
- **Prazer, intenção, "correu como querias".** Não se recolhe para
  investigação. A intenção vai existir na app, mas **fica fora do modo
  investigação por defeito** (são dos dados mais sensíveis: "aguentar o dia",
  "não sentir", "sexo", "trabalhar").
- **Quem são as pessoas.** Não há idade, género, substância por pessoa, país.
  Sem isso não se descreve a amostra — mas pedir isso aumenta o risco.

## Decisões para os focus groups

1. Que perguntas interessam a quem usa? (As acima são de quem investiga.)
2. Vale a pena juntar alguma coisa nova? Cada campo novo = mais risco:
   - dados por dia (para perguntas "ontem → hoje");
   - intenção / "correu como querias" com autorização à parte;
   - dados demográficos mínimos.
3. Há campos que se podem **tirar** por não servirem nenhuma pergunta?
   (ex.: gatilhos do sono, contagem de emoções)
4. Quem decide o que se faz com os dados, quem tem acesso, por quanto tempo se
   guardam, e como se apaga a ficha de alguém que pede.
5. Mínimo de pessoas para publicar qualquer número (hoje o ecrã não mostra
   médias de grupo; numa publicação, propor ≥ 5 por célula).

## Para escrever na candidatura / tese (honesto)

- "Dados pseudónimos, agregados por semana no próprio telemóvel, sem texto
  livre; participação opcional e revogável."
- Não escrever "anónimos": as semanas da mesma pessoa estão ligadas.
- Hora de deitar: média circular a partir de 14-11-2026; as fichas do último
  ano foram recalculadas na sincronização seguinte de cada pessoa ativa.
