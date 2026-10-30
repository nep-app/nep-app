// ===== PROTEÇÃO CONTRA EXTENSÕES QUE MEXEM NO TEXTO DA PÁGINA =====
// Extensões de leitura (tipo "Bionic Reading", que pinta o início das
// palavras a negrito), tradutores automáticos e afins trocam os textos da
// página por outros elementos sem o React saber. Quando o React depois quer
// pôr ou tirar alguma coisa ao lado de um texto que já não está lá, o
// navegador dá erro ("insertBefore… is not a child of this node") e a app
// inteira partia: aparecia "Algo correu mal" e, ao recarregar, voltava a
// pedir a password — a pessoa não conseguia fazer nada.
//
// Aqui, quando o sítio de referência já não existe: ao inserir, põe-se no fim
// do mesmo sítio (aparece, em vez de partir); ao remover, se já não está lá,
// não há nada a remover. O resto continua exatamente igual.
// (A solução conhecida para este problema do React: facebook/react#11538.)
//
// ⚠️ Com uma extensão destas ligada, um texto que mude pode ficar com o valor
// antigo no ecrã (a extensão guardou a sua cópia). Por isso a app avisa na
// consola; o certo é desligar a extensão neste site.
export function installDomGuard() {
  if (typeof Node !== 'function' || !Node.prototype || Node.prototype.__nepDomGuard) return;
  const originalRemoveChild = Node.prototype.removeChild;
  const originalInsertBefore = Node.prototype.insertBefore;

  Node.prototype.removeChild = function removeChild(child) {
    if (child && child.parentNode !== this) {
      console.warn('[domGuard] removeChild: o elemento já não estava aqui (extensão a mexer na página?)');
      return child;
    }
    return originalRemoveChild.apply(this, arguments);
  };

  Node.prototype.insertBefore = function insertBefore(newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      console.warn('[domGuard] insertBefore: a referência já não estava aqui (extensão a mexer na página?)');
      return originalInsertBefore.call(this, newNode, null);
    }
    return originalInsertBefore.apply(this, arguments);
  };

  Object.defineProperty(Node.prototype, '__nepDomGuard', { value: true });
}
