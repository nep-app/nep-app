/**
 * Controlo de quem pode CRIAR conta nova (código de convite).
 *
 * A Teresa quis poder autorizar quem entra. Só quem tiver um destes códigos
 * consegue registar-se; fazer login numa conta já existente não pede código.
 *
 * ⚠️ É uma "porta com fechadura", não um "cofre": como a app corre no
 *    telemóvel/navegador, alguém muito técnico e mal-intencionado poderia
 *    encontrar o código no código da app. Chega bem para uma rede de confiança.
 *
 * Para MUDAR / ADICIONAR / RODAR códigos: editar a lista abaixo (é preciso
 * um novo deploy). Pode haver vários em simultâneo. A comparação ignora
 * maiúsculas/minúsculas e espaços à volta.
 */
// Códigos pessoais: um por pessoa convidada, para se poder retirar um sem
// mexer nos outros. NUNCA pôr aqui nomes nem alcunhas — este ficheiro é
// público (repositório e app publicada) e revelaria quem usa a NEP. Quem é
// dono de que código fica só com a Teresa.
// Retirar um código só impede contas NOVAS; uma conta já criada continua a
// funcionar.
export const INVITE_CODES = [
  'NAOSEI-2026',
  'NEP-957W-8HX7', // convite pessoal (out/2026)
];

const normalize = (s) => String(s || '').trim().toUpperCase();

export function isValidInviteCode(input) {
  const val = normalize(input);
  if (!val) return false;
  return INVITE_CODES.map(normalize).some((code) => code && code === val);
}
