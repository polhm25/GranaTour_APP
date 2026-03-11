// Edge Function: send-push-notification
// Envía una notificación push al cliente cuando el guía cambia el estado de su reserva.
// Llamada desde guideStore.updateBookingStatus tras un cambio de estado exitoso.
//
// DESPLIEGUE:
//   supabase functions deploy send-push-notification
//
// VARIABLES DE ENTORNO necesarias en Supabase Dashboard → Edge Functions → Secrets:
//   SUPABASE_URL            → URL del proyecto Supabase
//   SUPABASE_SERVICE_ROLE_KEY → Service role key (bypass RLS para leer push_tokens)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface SendPushBody {
  id_usuario: number;       // ID del cliente que recibirá la notificación
  booking_id: number;       // ID de la reserva afectada
  excursion_nombre: string; // Nombre de la excursión
  new_status: 'confirmada' | 'cancelada';
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
  priority?: 'default' | 'normal' | 'high';
}

// ─── Handler principal ────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // Solo aceptar POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: SendPushBody = await req.json();
    const { id_usuario, booking_id, excursion_nombre, new_status } = body;

    if (!id_usuario || !booking_id || !excursion_nombre || !new_status) {
      return new Response(JSON.stringify({ error: 'Parámetros incompletos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Cliente Supabase con service role para leer push_tokens (bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Obtener tokens activos del usuario
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from('push_tokens')
      .select('token')
      .eq('id_usuario', id_usuario)
      .eq('activo', true);

    if (tokensError) {
      console.error('[GranaTour] send-push: error leyendo tokens:', tokensError);
      return new Response(JSON.stringify({ error: 'Error interno' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!tokens || tokens.length === 0) {
      // El usuario no tiene tokens activos (sin dispositivo registrado o permisos denegados)
      return new Response(
        JSON.stringify({ sent: 0, message: 'Sin tokens activos para este usuario' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Construir mensaje según el nuevo estado
    const isConfirmada = new_status === 'confirmada';
    const title = isConfirmada ? '¡Reserva confirmada!' : 'Reserva cancelada';
    const body_text = isConfirmada
      ? `Tu reserva para "${excursion_nombre}" ha sido confirmada por el guía.`
      : `Tu reserva para "${excursion_nombre}" ha sido cancelada por el guía.`;

    // Preparar mensajes para la Expo Push API
    const messages: ExpoPushMessage[] = tokens
      .filter((t: { token: string }) => t.token.startsWith('ExponentPushToken['))
      .map((t: { token: string }) => ({
        to: t.token,
        title,
        body: body_text,
        data: { booking_id, status: new_status },
        sound: 'default',
        priority: 'high',
      }));

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'Tokens no válidos para Expo' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Enviar a la Expo Push API
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    });

    const expoData = await expoResponse.json();

    return new Response(
      JSON.stringify({ sent: messages.length, expo_response: expoData }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[GranaTour] send-push error inesperado:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
