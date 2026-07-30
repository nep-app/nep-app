import React, { useState } from 'react';

// Botão definido FORA do componente (evita remontagens a cada tecla → toques falhados).
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
 * Calculadora-disfarce. Funciona a sério como calculadora.
 *
 * ENTRAR NA NEP (gesto secreto): carregar em "AC" 3 vezes seguidas → entra em
 * "modo código" (os dígitos passam a aparecer como ••••, escondidos) → escreve o
 * PIN → "=". Se o PIN estiver certo, a NEP abre. Se estiver errado, volta a ser
 * calculadora, sem dar pista nenhuma. Uma conta normal NUNCA tenta o PIN.
 */
export function CalculatorDecoy({ onPinAttempt }) {
  const [display, setDisplay] = useState('0');
  const [stored, setStored] = useState(null);
  const [op, setOp] = useState(null);
  const [fresh, setFresh] = useState(true);
  const [acCount, setAcCount] = useState(0);     // AC seguidos (3 → modo código)
  const [codeMode, setCodeMode] = useState(false);
  const [codePin, setCodePin] = useState('');     // PIN escondido em construção

  // Qualquer tecla que não seja AC quebra a sequência de 3 AC.
  const breakAc = () => { if (acCount) setAcCount(0); };

  const inputDigit = (d) => {
    if (codeMode) { setCodePin((p) => (p.length >= 12 ? p : p + d)); return; }
    breakAc();
    if (fresh) { setDisplay(d); setFresh(false); return; }
    setDisplay((cur) => (cur.length >= 15 ? cur : cur + d));
  };

  const inputDot = () => {
    if (codeMode) return;
    breakAc();
    if (fresh) { setDisplay('0.'); setFresh(false); return; }
    setDisplay((cur) => (cur.includes('.') ? cur : cur + '.'));
  };

  // "AC": em modo código, cancela e volta à calculadora. Senão, conta os AC
  // seguidos — ao 3.º, entra em modo código (o gesto secreto).
  const onAC = () => {
    if (codeMode) { setCodeMode(false); setCodePin(''); setDisplay('0'); setStored(null); setOp(null); setFresh(true); setAcCount(0); return; }
    setDisplay('0'); setStored(null); setOp(null); setFresh(true);
    const n = acCount + 1;
    if (n >= 3) { setCodeMode(true); setCodePin(''); setAcCount(0); }
    else setAcCount(n);
  };

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
    if (codeMode) return; // em modo código não há operações
    breakAc();
    if (op && !fresh && stored != null) {
      const r = compute(stored, display, op);
      setStored(r); setDisplay(r);
    } else {
      setStored(display);
    }
    setOp(operator); setFresh(true);
  };

  const equals = () => {
    if (codeMode) {
      // Submeter o PIN escondido. Certo → abre a NEP (o pai desmonta isto).
      // Errado → volta a ser calculadora, sem pista.
      if (onPinAttempt && codePin) onPinAttempt(codePin);
      setCodeMode(false); setCodePin(''); setDisplay('0'); setFresh(true);
      return;
    }
    breakAc();
    if (op != null && stored != null) {
      const r = compute(stored, display, op);
      setDisplay(r); setStored(null); setOp(null); setFresh(true);
    }
    // número + "=" sem operação → como numa calculadora real, não faz nada.
  };

  const percent = () => { if (codeMode) return; breakAc(); setDisplay((cur) => String(parseFloat(cur) / 100)); };
  const toggleSign = () => { if (codeMode) return; breakAc(); setDisplay((cur) => (cur.startsWith('-') ? cur.slice(1) : (cur === '0' ? cur : '-' + cur))); };

  // O que se vê no visor: em modo código, pontinhos (esconde o PIN); senão, o número.
  const shown = codeMode ? (codePin ? '•'.repeat(codePin.length) : '0') : display;

  return (
    <div
      className="fixed inset-0 bg-black flex flex-col select-none"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex-1 min-h-0 flex flex-col items-end justify-end px-6 pb-4">
        <div className="text-neutral-500 text-2xl h-8 break-all text-right">
          {!codeMode && op ? `${stored ?? ''} ${op}` : ''}
        </div>
        <div className="text-white text-6xl font-light break-all text-right leading-none">{shown}</div>
      </div>

      <div className="grid grid-cols-4 grid-rows-5 gap-2 px-3 pb-3" style={{ height: '62vh', maxHeight: '460px' }}>
        <Btn label="AC" kind="fn" onClick={onAC} />
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
