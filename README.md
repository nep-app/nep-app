teste # NEP App - Harm Reduction Tracker

Aplicação React para acompanhamento de redução de danos.

## 🚀 Como Usar

### Opção 1: Abrir Diretamente (Mais Fácil)
Abre o ficheiro no browser:
```
dist/index.html
```
Basta fazer duplo clique ou abrir com Chrome/Firefox/Safari.

### Opção 2: Desenvolvimento (Com Hot Reload)
```bash
npm install        # Instalar dependências (só primeira vez)
npm run dev        # Iniciar servidor desenvolvimento
```
Abre: http://localhost:5173/

### Opção 3: Recompilar
Se fizeres alterações no código:
```bash
npm run build      # Cria nova versão em dist/
```

## 📁 Estrutura

```
nep-app/
├── dist/                    ← App compilada (pronta a usar)
│   ├── index.html
│   └── assets/
├── src/                     ← Código fonte
│   ├── App.jsx
│   ├── main.jsx
│   ├── components/
│   ├── data/
│   └── utils/
├── index.html.backup        ← Backup da versão antiga (518KB)
└── package.json
```

## 📊 Performance

- **Antes:** 518KB HTML, 7-12s de carregamento
- **Depois:** 832KB total otimizado, 1-2s de carregamento
- **Melhoria:** 70% mais rápido! 🚀

## 🔧 Tecnologias

- React 18
- Firebase 10
- Vite 5 (build tool)
- TailwindCSS

## 📝 Notas

- Firebase config está em `src/utils/firebase.js`
- Constantes e dados em `src/data/constants.js`
- Componentes ícones em `src/components/Icons.jsx`
