export interface Entrada {
  usada: boolean;
  [key: string]: unknown;
}

export async function getEntrada(
  kv: KVNamespace,
  id: string,
): Promise<Entrada | null> {
  const raw = await kv.get(id);
  return raw ? JSON.parse(raw) : null;
}

export async function marcarComoUsada(
  kv: KVNamespace,
  id: string,
  entrada: Entrada,
) {
  entrada.usada = true;
  await kv.put(id, JSON.stringify(entrada));
}

const CONTADOR_KEY = "contador_usadas";

export async function getContador(kv: KVNamespace): Promise<number> {
  const valor = await kv.get(CONTADOR_KEY);
  return valor ? parseInt(valor, 10) : 0;
}

export async function incrementarContador(kv: KVNamespace): Promise<void> {
  const actual = await getContador(kv);
  await kv.put(CONTADOR_KEY, String(actual + 1));
}