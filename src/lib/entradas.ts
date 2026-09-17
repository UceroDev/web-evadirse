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
