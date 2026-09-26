/**
 * Mascaras de exibicao. O banco guarda SO digitos (CPF, telefone, CNPJ);
 * a formatacao e sempre feita aqui, na hora de mostrar/digitar.
 */

export const soDigitos = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");

/** 52998224725 -> 529.982.247-25 (parcial enquanto digita) */
export function cpf(v: string | null | undefined): string {
  const d = soDigitos(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

/** 13987654321 -> (13) 98765-4321 · 1332221111 -> (13) 3222-1111 */
export function telefone(v: string | null | undefined): string {
  const d = soDigitos(v).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  const ddd = d.slice(0, 2);
  const n = d.slice(2);
  if (n.length <= 4) return `(${ddd}) ${n}`;
  const corte = d.length === 11 ? 5 : 4;
  return `(${ddd}) ${n.slice(0, corte)}-${n.slice(corte)}`;
}

/** Mesma regra do banco (cpf_valido): formato + digitos verificadores. */
export function cpfValido(v: string): boolean {
  const d = soDigitos(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const n = d.split("").map(Number);
  for (const t of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += n[i] * (t + 1 - i);
    let r = (soma * 10) % 11;
    if (r === 10) r = 0;
    if (r !== n[t]) return false;
  }
  return true;
}
