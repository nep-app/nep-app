import React, { useState } from 'react';
import { safeLocalStorage } from '../utils/storage';

/**
 * Calculadora-disfarce. Quando o "Modo disfarce" está ligado, é isto que aparece
 * ao abrir a app — uma calculadora que funciona a sério. Escrever o CÓDIGO secreto
 * e carregar em "=" revela a NEP por trás (onUnlock). Quem não souber o código só
 * vê uma calculadora normal.
 *
 * NOTA: o código só destranca o ecrã de disfarce (a interface). Os DADOS continuam
 * protegidos pelo PIN/encriptação — o disfarce esconde QUE a app existe, não os dados.
 */
export function CalculatorDecoy({ onUnlock }) {
  const [display, setDisplay] = useState('0');
  const [stored, setStored] = useState(null);   // valor guardado
  const [op, setOp] = useState(null);            // operação pendente
  const [fresh, setFresh] = useState(true);      // próximo dígito começa novo número

  const code = safeLocalStorage.get('nep_disguise_code', '') || '';

  const inputDigit = (d) => {
    if (fresh) { setDisplay(d); setFresh(false); return; }
    setDisplay((cur) => (cur === '0' ? d : (cur.length >= 15 ? cur : cur + d)));
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
    // arredondar para evitar 0.30000000000004
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
    // GATE do disfarce: se o que está no visor é EXATAMENTE o código → revela a app.
    if (code && display === code) { onUnlock(); return; }
    if (op && stored != null) {
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
      <button
        onClick={onClick}
        className={`${base} ${styles[kind]} ${wide ? 'col-span-2 justify-start pl-7' : ''}`}
      >
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
