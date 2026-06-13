# CLAUDE.md — nep-app

## Regras de desenvolvimento

### Performance e lazy-loading
Após qualquer otimização de performance ou alteração de lazy-loading, verifica se a app ainda arranca sem erros de TDZ ("Cannot access X before initialization") e retesta o contador de dias de utilização antes de fazeres commit.

### Linguagem das explicações
Explica as alterações em português simples e não técnico. Evita jargão denso — o utilizador não é programador e precisa de linguagem simples. Usa analogias do dia a dia.

### Autenticação e PIN
Qualquer refactor de autenticação/bloqueio/PIN deve ser testado em recarregamentos completos de página (não apenas na sessão) e verificado se o login por PIN continua a funcionar antes do commit. Nunca assumas que reinstalar a PWA é desnecessário.

### Fusos horários e limites de meia-noite
Ao agrupar ou comparar eventos de consumo por data/hora, tem em conta o fuso horário UTC vs local e o caso limite de 00:00 = 0 minutos para que os alertas de metas não sejam disparados erradamente.

### Remoção de campos
Quando for pedido para remover um campo (ex: lastBefore00), confirma se os registos antigos continuam a contar corretamente em TODAS as análises e indica explicitamente o que foi alterado.

## Antes de cada commit
- Constrói a app (`npm run build`) e verifica se não há erros
- Verifica se não há erros de TDZ/inicialização na consola
- Confirma que o contador de dias de utilização está correto
- Testa o login por PIN após qualquer alteração de autenticação
- Lista explicitamente o que foi verificado
