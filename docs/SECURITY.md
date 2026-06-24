# 🔒 Segurança - Firebase Security Rules

## Como aplicar as regras de segurança

As regras de segurança do Firestore estão no ficheiro `firestore.rules`.

### Opção 1: Firebase Console (Recomendado para iniciantes)

1. Vai a https://console.firebase.google.com/
2. Seleciona o teu projeto: **harm-reduction-d4f7d**
3. No menu lateral, clica em **Firestore Database**
4. Clica no separador **Regras** (Rules)
5. Copia todo o conteúdo do ficheiro `firestore.rules`
6. Cola no editor de regras
7. Clica em **Publicar** (Publish)

### Opção 2: Firebase CLI

Se tens o Firebase CLI instalado:

```bash
firebase deploy --only firestore:rules
```

## O que estas regras fazem

✅ **Protegem os teus dados:**
- Só utilizadores autenticados podem aceder aos dados
- Cada utilizador só vê os SEUS próprios dados
- Ninguém pode aceder aos dados de outros utilizadores

✅ **Validam a forma dos documentos:**
- Os dados são cifrados no cliente (E2E) antes de subir, por isso a nuvem só vê
  um envelope cifrado (`data` + `iv`) — não há campos em claro como humor ou notas
- As regras validam que esse envelope existe e tem um tamanho máximo (previne abuse)
- Escritas só são aceites em coleções conhecidas
- Nota: validações de conteúdo (ex: humor 1-10) acontecem no cliente, não no servidor,
  porque o servidor não consegue (nem deve) ler o conteúdo cifrado

✅ **Negam acesso por defeito:**
- Qualquer rota não explicitamente permitida é bloqueada

## Testar se as regras funcionam

Depois de publicar, tenta:

1. **Login com a tua conta** → Deve funcionar normalmente ✅
2. **Logout e tentar aceder aos dados** → Deve falhar ❌
3. **Ver dados de outro utilizador** → Deve falhar ❌

## Estado atual da segurança

Antes destas regras:
- 🔴 **ALTO RISCO** - Dados potencialmente acessíveis sem autenticação

Depois destas regras:
- 🟢 **BAIXO RISCO** - Dados protegidos por autenticação e validação de forma

⚠️ **A proteção depende da força da password da conta.** Como os dados são cifrados
com uma chave derivada do PIN/password, a segurança real é tão forte quanto esse
segredo: usa uma password de conta forte (12+ caracteres) e, idealmente, uma
passphrase alfanumérica em vez de um PIN só de dígitos.

## Notas importantes

⚠️ As API keys no código (`src/utils/firebase.js`) são **públicas** e isso é normal!
A proteção real vem destas Security Rules, não das API keys.

⚠️ Sempre que mudares o schema dos dados, atualiza as regras em conformidade.
