/// <reference types="astro/client" />

declare namespace Cloudflare {
  interface Env {
    PIN_VALIDACION: string;
    TURNSTILE_SECRET_KEY: string;
  }
}