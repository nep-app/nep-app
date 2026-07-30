import React, { useState } from 'react';

// Botão definido FORA do componente (evita remontagens a cada tecla).
const BTN_STYLES = {
  num: 'bg-neutral-700 text-white',
  fn: 'bg-neutral-500 text-white',
  op: 'bg-amber-500 text-white',
};
function Btn({ label, onClick, kind = 'num', wide = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex items-center justify-center rounded-full text-2xl font-medium select-none active:opacity-70 h-full ' +
        BTN_STYLES[kind] + (wide ? ' col-span-2 justify-start pl-7' : '')
      }
    >
      {label}
    </button>
  );
}

/**
 * Calculadora-disfarce. Aparece ao abrir a app quando o "Modo disfarce" está ligado.
 * Funciona a sério. Para entrar na NEP: escreve o teu PIN e carrega em "=" (número
 * + "=" sem operação tenta o PIN em silêncio). PIN errado → nada; conta com operação
 * (+ − × ÷) → faz mesmo a conta. Nunca guarda o PIN nem conta tentativas de bloqueio.
 */
export function CalculatorDecoy({ onPinAttempt }) {
  const [display, setDisplay] = useState('0');
  const [stored, setStored] = useState(null);
  const [op, setOp] = useState(null);
  const [fresh, setFresh] = useState(true);

  const inputDigit = (d) => {
    if (fresh) { setDisplay(d); setFresh(false); return; }
    setDisplay((cur) => (cur.length >= 15 ? cur : cur + d)); // mantém zeros à esquerda (para o PIN)
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
    if (op == null) {                    // número + "=" sem operação → tenta o PIN
      if (onPinAttempt) onPinAttempt(display);
      setFresh(true);
      return;
    }
    if (stored != null) {                // conta real
      const r = compute(stored, display, op);
      setDisplay(r); setStored(null); setOp(null); setFresh(true);
    }
  };

  const percent = () => setDisplay((cur) => String(parseFloat(cur) / 100));
  const toggleSign = () => setDisplay((cur) => (cur.startsWith('-') ? cur.slice(1) : (cur === '0' ? cur : '-' + cur)));

  return (
    <div
      className="fixed inset-0 bg-black flex flex-col select-none"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Mostrador: ocupa o espaço que sobra e encolhe se preciso (nunca empurra os botões). */}
      <div className="flex-1 min-h-0 flex flex-col items-end justify-end px-6 pb-4">
        {/* Linha de cima: a conta em curso (mostra o sinal da operação). */}
        <div className="text-neutral-500 text-2xl h-8 break-all text-right">
          {op ? `${stored ?? ''} ${op}` : ''}
        </div>
        <div className="text-white text-6xl font-light break-all text-right leading-none">{display}</div>
      </div>

      {/* Botões: altura fixa, sempre visíveis no fundo. */}
      <div className="grid grid-cols-4 grid-rows-5 gap-2 px-3 pb-3" style={{ height: '62vh', maxHeight: '460px' }}>
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
