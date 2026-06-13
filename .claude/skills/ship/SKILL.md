# /ship

Executa todos os passos para lançar uma nova versão da app:

1. Corre `npm run build` e verifica se não há erros
2. Verifica se não há erros de TDZ ou inicialização no output do build
3. Lê o `package.json` e o manifesto da PWA (`public/manifest.json` ou similar) e incrementa a versão patch (ex: 1.5.3 → 1.5.4)
4. Atualiza a versão em ambos os ficheiros
5. Faz commit com mensagem clara descrevendo o que mudou nesta versão
6. Faz `git push -u origin <branch-atual>`
7. Confirma que o push foi bem-sucedido e mostra a versão final
