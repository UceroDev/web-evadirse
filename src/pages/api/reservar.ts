export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { EmailMessage } from 'cloudflare:email';
import { createMimeMessage, Mailbox } from 'mimetext';

const REMITENTE = 'reservas@evadirseoficial.com';
// Debe coincidir con destination_address de wrangler.jsonc
const CORREO_MERCH = 'merch.evadirse@gmail.com';
const PAGINA_GRACIAS = '/reserva-enviada';
const OPCIONES_VALIDAS = [
  'camiseta-negra',
  'camiseta-blanca',
  'camiseta-negra-cd',
  'camiseta-blanca-cd',
  'cd',
];

function limpiar(valor: FormDataEntryValue | null, maxLen = 200): string {
  return String(valor || '')
    .replace(/[\r\n]/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export const POST: APIRoute = async ({ request, redirect }) => {
  // 1. Solo aceptar peticiones que vengan de la propia web
  //    (compara con el origen de la propia petición: funciona en el dominio,
  //     en www, en *.workers.dev y en local)
  const origin = request.headers.get('Origin') || '';
  if (origin !== new URL(request.url).origin) {
    return new Response('Origen no permitido', { status: 403 });
  }

  const formData = await request.formData();

  // 2. Honeypot: los bots creen que ha funcionado
  if (formData.get('empresa')) {
    return redirect(PAGINA_GRACIAS, 303);
  }

  // 3. Validar y sanear (antes del rate limit, para que un despiste
  //    en el formulario no bloquee al usuario 60 s)
  const nombre = limpiar(formData.get('nombre'), 80);
  const apellido = limpiar(formData.get('apellido'), 80);
  const correo = limpiar(formData.get('correo'), 200);
  const reserva = limpiar(formData.get('reserva'), 40);
  const comentarios = limpiar(formData.get('comentarios'), 1000);

  const correoValido = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(correo);

  if (!nombre || !apellido || !correoValido || !OPCIONES_VALIDAS.includes(reserva)) {
    return new Response('Datos inválidos', { status: 400 });
  }

  // 4. Verificar Turnstile
  const turnstileToken = formData.get('cf-turnstile-response');
  const ip = request.headers.get('CF-Connecting-IP') || '';

  const turnstileRes = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET_KEY,
        response: String(turnstileToken || ''),
        remoteip: ip,
      }),
    }
  );
  const turnstileData = (await turnstileRes.json()) as { success: boolean };
  if (!turnstileData.success) {
    return new Response('No se pudo verificar que eres humano', { status: 400 });
  }

  // 5. Rate limiting por IP con KV
  if (env.RESERVAS_KV) {
    const clave = `rl:${ip}`;
    if (await env.RESERVAS_KV.get(clave)) {
      return new Response('Demasiadas peticiones, espera un momento', { status: 429 });
    }
    await env.RESERVAS_KV.put(clave, '1', { expirationTtl: 60 });
  }

  // 6. Construir y enviar el correo con Email Routing
  try {
    const msg = createMimeMessage();
    msg.setSender({ name: 'Reservas Merch', addr: REMITENTE });
    msg.setRecipient(CORREO_MERCH);
    // Reply-To exige un objeto Mailbox: con un string, mimetext lanza una excepción.
    // Así puedes responder directo al comprador.
    msg.setHeader('Reply-To', new Mailbox({ name: `${nombre} ${apellido}`, addr: correo }));
    msg.setSubject(`Nueva reserva: ${reserva}`);
    msg.addMessage({
      contentType: 'text/plain',
      data:
        `Nombre: ${nombre} ${apellido}\n` +
        `Correo: ${correo}\n` +
        `Reserva: ${reserva}\n` +
        `Comentarios: ${comentarios || '(sin comentarios)'}`,
    });

    const emailMessage = new EmailMessage(REMITENTE, CORREO_MERCH, msg.asRaw());
    await env.EMAIL.send(emailMessage);
  } catch (err) {
    console.error('Error al enviar el correo de reserva:', err);
    return new Response('Error al enviar el correo, inténtalo de nuevo', { status: 502 });
  }

  // 7. Todo bien: llevar al usuario a la página de confirmación
  return redirect(PAGINA_GRACIAS, 303);
};