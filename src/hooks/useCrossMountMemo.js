import { useMemo } from 'react';

/**
 * useCrossMountMemo — memória que SOBREVIVE à desmontagem do componente.
 *
 * O useMemo normal perde o resultado quando o componente é desmontado (ex: ao
 * trocar de separador). Isto faz com que separadores pesados refaçam TODAS as
 * contas sempre que voltas a eles.
 *
 * Este hook guarda o resultado num cache ao nível do módulo, indexado por uma
 * "assinatura" barata dos dados. Enquanto a assinatura não muda (mesmos dados),
 * voltar ao separador devolve o resultado guardado INSTANTANEAMENTE — sem refazer
 * o cálculo. Quando os dados mudam (a assinatura muda), recalcula uma vez.
 *
 * @param {string} key - identificador único deste cálculo (ex: 'analises-correlacoes')
 * @param {string|number} signature - valor barato que muda quando os dados mudam
 * @param {Function} factory - função que produz o resultado (chamada só quando preciso)
 */
const _cache = new Map();

/** Limpar toda a memória entre-trocas (chamar no logout / reset). */
export function clearCrossMountMemo() {
  _cache.clear();
}

export function useCrossMountMemo(key, signature, factory) {
  return useMemo(() => {
    const hit = _cache.get(key);
    if (hit && hit.sig === signature) return hit.value;
    const value = factory();
    _cache.set(key, { sig: signature, value });
    return value;
    // factory de propósito fora das deps: recalcula só quando a assinatura muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, signature]);
}
