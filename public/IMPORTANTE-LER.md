# ⚠️ IMPORTANTE: Internet Necessária

A app **nep-app-rapida.html** e **nep-app-funcional.html** precisam de **INTERNET** para funcionar porque usam:

1. **Firebase** - Para guardar os teus dados na cloud
2. **TailwindCSS CDN** - Para os estilos visuais

## ❓ O que fazer:

### Se tens internet:
- Verifica se o teu firewall não está a bloquear
- Tenta noutro browser (Chrome, Firefox, Edge)
- Abre a "Consola do Desenvolvedor" (F12) e vê se há erros

### Se queres usar SEM internet:
**Não é possível** porque os dados ficam guardados no Firebase (online). Sem Firebase, perdes todos os registos quando fechas a app.

---

## 🔧 Testes:

1. Abre `teste-simples.html` - diz se tens internet
2. Se aparecer "✅ React carregou", então tens internet
3. Se aparecer "❌ Sem internet", a app não vai funcionar

---

## 💡 Alternativa:

Se quiseres uma versão que funciona **completamente offline** (sem Firebase), posso criar mas:
- ⚠️ Dados guardados só no teu PC
- ⚠️ Se apagares o browser, perdes tudo
- ⚠️ Não sincroniza entre dispositivos

Queres que eu crie essa versão?
