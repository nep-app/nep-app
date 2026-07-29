import React, { useState } from 'react';

/**
 * Calculadora-disfarce. Quando o "Modo disfarce" está ligado, é isto que aparece
 * ao abrir a app — uma calculadora que funciona a sério.
 *
 * Destrancar: escreve o teu PIN (só dígitos) e carrega em "=". Como numa
 * calculadora real "número + =" (sem operação) não faz nada, usamos esse gesto
 * para TENTAR o PIN em silêncio. Se estiver certo → abre a NEP (onPinAttempt
 * trata disso). Se estiver errado → nada acontece, continua a parecer calculadora.
 * Se usaste uma operação (+ − × ÷), o "=" faz mesmo a conta (nunca tenta o PIN).
 *
 * NOTA: o PIN é escrito na hora (nunca fica guardado). As tentativas na
 * calculadora NÃO contam para o bloqueio (o pai repõe o contador de falhas).
 */
export function CalculatorDecoy({ onPinAttempt }) {
  const [display, setDisplay] = useState('0');
  const [stored, setStored] = useState(null);
  const [op, setOp] = useState(null);
  const [fresh, setFresh] = useState(true);

  const inputDigit = (d) => {
    if (fresh) { setDisplay(d); setFresh(false); return; }
    // Acumula (mantém zeros à esquerda para o PIN funcionar), com limite de tamanho.
    setDisplay((cur) => (cur.length >= 15 ? cur : cur + d));
  };

  const inputDot = () => {
    if (fresh) { setDisplay('0.'); setFresh(false); return; }
    setDisplay((cur) => (cur.includes('.') ? cur : cur + '.'));
  };

  const clearAll = () => { setDisplay('0'); setStored(null); setOp(null); setFresh(true); };

  const compute = (a, b, operator) => {
    const x = parseFloat(a), y = parseFloat(b);
    if (isNaN(x) || isNaN(y)) return b;
    let r = y;
    if (operator === '+') r = x + y;
    else if (operator === '−') r = x - y;
    else if (operator === '×') r = x * y;
    else if (operator === '÷') r = y === 0 ? 0 : x / y;
    return String(Math.round(r * 1e10) / 1e10);
  };

  const chooseOp = (operator) => {
    if (op && !fresh && stored != null) {
      const r = compute(stored, display, op);
      setStored(r); setDisplay(r);
    } else {
      setStored(display);
    }
    setOp(operator); setFresh(true);
  };

  const equals = () => {
    // Sem operação pendente → gesto de "número + =" → TENTA o PIN em silêncio.
    if (op == null) {
      if (onPinAttempt) onPinAttempt(display);
      setFresh(true);
      return;
    }
    // Com operação → conta normal (nunca tenta o PIN).
    if (stored != null) {
      const r = compute(stored, display, op);
      setDisplay(r); setStored(null); setOp(null); setFresh(true);
    }
  };

  const percent = () => setDisplay((cur) => String(parseFloat(cur) / 100));
  const toggleSign = () => setDisplay((cur) => (cur.startsWith('-') ? cur.slice(1) : (cur === '0' ? cur : '-' + cur)));

  const Btn = ({ label, onClick, kind = 'num', wide = false }) => {
    const base = 'flex items-center justify-center rounded-full text-2xl font-medium select-none active:opacity-70 transition-opacity h-16';
    const styles = {
      num: 'bg-neutral-700 text-white',
      fn: 'bg-neutral-500 text-white',
      op: 'bg-amber-500 text-white',
    };
    return (
      <button onClick={onClick} className={`${base} ${styles[kind]} ${wide ? 'col-span-2 justify-start pl-7' : ''}`}>
        {label}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col justify-end p-4 select-none">
      <div className="text-right text-white text-6xl font-light px-3 pb-6 pt-10 break-all overflow-hidden" style={{ minHeight: '96px' }}>
        {display}
      </div>
      <div className="grid grid-cols-4 gap-3 pb-4">
        <Btn label="AC" kind="fn" onClick={clearAll} />
        <Btn label="±" kind="fn" onClick={toggleSign} />
        <Btn label="%" kind="fn" onClick={percent} />
        <Btn label="÷" kind="op" onClick={() => chooseOp('÷')} />

        <Btn label="7" onClick={() => inputDigit('7')} />
        <Btn label="8" onClick={() => inputDigit('8')} />
        <Btn label="9" onClick={() => inputDigit('9')} />
        <Btn label="×" kind="op" onClick={() => chooseOp('×')} />

        <Btn label="4" onClick={() => inputDigit('4')} />
        <Btn label="5" onClick={() => inputDigit('5')} />
        <Btn label="6" onClick={() => inputDigit('6')} />
        <Btn label="−" kind="op" onClick={() => chooseOp('−')} />

        <Btn label="1" onClick={() => inputDigit('1')} />
        <Btn label="2" onClick={() => inputDigit('2')} />
        <Btn label="3" onClick={() => inputDigit('3')} />
        <Btn label="+" kind="op" onClick={() => chooseOp('+')} />

        <Btn label="0" wide onClick={() => inputDigit('0')} />
        <Btn label="," onClick={inputDot} />
        <Btn label="=" kind="op" onClick={equals} />
      </div>
    </div>
  );
}
