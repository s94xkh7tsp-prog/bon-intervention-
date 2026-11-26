/**
 * WhatsApp Business Platform Integration — Phase 1 MVP
 * Cloudflare Worker pour JM Express Auto Dépannage
 * 
 * Endpoints:
 * - POST /whatsapp/webhook → reçoit les messages Meta (validation + stockage D1)
 * - GET  /whatsapp/messages → liste les messages en attente de validation
 * - POST /whatsapp/send → envoie un message validé au client
 * - POST /whatsapp/validate → valide + sauvegarde une réponse
 */

// Secrets requis dans l'environnement Cloudflare : META_WEBHOOK_TOKEN,
// META_APP_SECRET et ADMIN_API_TOKEN. Les valeurs ne sont jamais stockées dans le code.
function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

function isAdminAuthorized(request, env) {
  const expected = env.ADMIN_API_TOKEN;
  const authorization = request.headers.get('Authorization') || '';
  return Boolean(expected && constantTimeEqual(authorization, `Bearer ${expected}`));
}

async function isMetaSignatureValid(rawBody, signatureHeader, appSecret) {
  if (!appSecret || !signatureHeader || !signatureHeader.startsWith('sha256=')) return false;
  const supplied = signatureHeader.slice('sha256='.length).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(supplied)) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const digest = await crypto.subtle.sign('HMAC', key, rawBody);
  const expected = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  return constantTimeEqual(supplied, expected);
}

/**
 * POST /whatsapp/webhook
 * Reçoit les webhooks des messages entrants de Meta
 */
export async function handleWhatsAppWebhook(request, env) {
  // Vérification de la signature Meta
  if (request.method === 'GET') {
    // Vérification initiale de Meta
    const mode = new URL(request.url).searchParams.get('hub.mode');
    const token = new URL(request.url).searchParams.get('hub.verify_token');
    const challenge = new URL(request.url).searchParams.get('hub.challenge');
    
    if (mode === 'subscribe' && env.META_WEBHOOK_TOKEN && constantTimeEqual(token || '', env.META_WEBHOOK_TOKEN)) {
      return new Response(challenge);
    }
    return new Response('Forbidden', { status: 403 });
  }

  // POST : vérifier la signature sur le corps brut avant toute lecture ou écriture.
  if (request.method === 'POST') {
    const rawBody = await request.arrayBuffer();
    const signature = request.headers.get('X-Hub-Signature-256');
    if (!(await isMetaSignatureValid(rawBody, signature, env.META_APP_SECRET))) {
      return new Response('Invalid webhook signature', { status: 401 });
    }
    let body;
    try {
      body = JSON.parse(new TextDecoder().decode(rawBody));
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }
    if (!env.DB) return new Response('Database unavailable', { status: 503 });
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const messages = change?.value?.messages || [];
    const contacts = change?.value?.contacts || [];

    for (const msg of messages) {
      const fromNumber = msg.from;
      const msgId = msg.id;
      const timestamp = msg.timestamp;
      const text = msg.text?.body || '';
      const msgType = msg.type; // text, image, document, etc.

      // Parser simple : extraction du type de demande
      const parsed = parseClientMessage(text);

      // Stocker en D1
      await env.DB.prepare(`
        INSERT OR IGNORE INTO whatsapp_messages 
        (msg_id, from_number, message_text, message_type, timestamp, status, parsed_data, confidence_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        msgId,
        fromNumber,
        text,
        msgType,
        new Date(timestamp * 1000).toISOString(),
        'PENDING', // En attente de validation
        JSON.stringify(parsed),
        parsed.confidence || 0.5
      ).run();

      console.log(`[WhatsApp] Message reçu de ${fromNumber}: "${text.substring(0, 50)}..."`);
    }

    // Répondre à Meta avec succès (obligatoire)
    return new Response('EVENT_RECEIVED', { status: 200 });
  }

  return new Response('Method not allowed', { status: 405 });
}

/**
 * GET /whatsapp/messages
 * Retourne les messages en attente de validation + les messages avec statut DRAFT
 */
export async function getWhatsAppMessages(request, env) {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }
  if (!isAdminAuthorized(request, env)) return new Response('Unauthorized', { status: 401 });
  if (!env.DB) return new Response('Database unavailable', { status: 503 });

  const messages = await env.DB.prepare(`
    SELECT id, from_number, message_text, timestamp, status, parsed_data, confidence_score, response_draft
    FROM whatsapp_messages
    WHERE status IN ('PENDING', 'DRAFT')
    ORDER BY timestamp DESC
    LIMIT 50
  `).all();

  return new Response(JSON.stringify(messages.results), {
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /whatsapp/validate
 * Valide une réponse draft, puis la marque prête à envoyer
 * Body: { message_id, response_text, validated_data }
 */
export async function validateWhatsAppResponse(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  if (!isAdminAuthorized(request, env)) return new Response('Unauthorized', { status: 401 });
  if (!env.DB) return new Response('Database unavailable', { status: 503 });

  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const { message_id, response_text, validated_data } = payload;
  if (!Number.isInteger(Number(message_id)) || typeof response_text !== 'string') {
    return new Response('Invalid request', { status: 400 });
  }

  await env.DB.prepare(`
    UPDATE whatsapp_messages
    SET status = ?, response_draft = ?, validated_data = ?, validated_at = ?
    WHERE id = ?
  `).bind(
    'READY_TO_SEND',
    response_text,
    JSON.stringify(validated_data),
    new Date().toISOString(),
    message_id
  ).run();

  return new Response(JSON.stringify({ success: true, msg_id: message_id }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /whatsapp/send
 * Envoie le message validé au client via Meta API
 * Body: { message_id }
 */
export async function sendWhatsAppMessage(request) {
  // L'envoi reste volontairement désactivé durant la préparation et les essais.
  return new Response('WhatsApp sending is disabled during setup', {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Parser simple : détecte type de panne, adresse, urgence
 * Retourne: { type, address, urgency, missing, confidence }
 */
function parseClientMessage(text) {
  const lower = text.toLowerCase();
  
  // Détection du type de panne
  const types = {
    battery: /batter|démarr|courant|électr/i,
    tire: /pneu|crevaison|éclaté/i,
    towing: /remoqu|dépann|cass|accident|route/i,
    fuel: /carburant|essence|diesel|vidang|erreur|mauvais|vidang|pompe/i,
    unlock: /fermé|serr|clés|clé|accès|bloqué/i,
    other: /aide|dépann|aide/i,
  };

  let detectedType = 'assistance';
  let typeScore = 0.5;

  for (const [t, regex] of Object.entries(types)) {
    if (regex.test(lower)) {
      detectedType = t;
      typeScore = 0.8;
      break;
    }
  }

  // Détection de l'urgence
  const urgentKeywords = /urgent|rapide|secours|vite|emergency|immédiat|maintenant|now/i;
  const urgency = urgentKeywords.test(text) ? 'HIGH' : 'NORMAL';

  // Détection basique d'adresse (3+ lettres + chiffres)
  const addressMatch = text.match(/(\d+.*(?:rue|avenue|boulevard|place|route|bd|av|r\.))|([\w\s]{5,})/i);
  const hasAddress = !!addressMatch;

  // Détection du véhicule (marque commune)
  const vehicleKeywords = /citroën|peugeot|renault|ford|opel|audi|volkswagen|bmw|mercedes|skoda|dacia|fiat|toyota|hyundai|kia|nissan|jeep|volvo|porsche/i;
  const hasVehicle = vehicleKeywords.test(text);

  // Calcul confiance globale
  let confidence = typeScore * 0.4;
  if (hasAddress) confidence += 0.2;
  if (hasVehicle) confidence += 0.2;
  if (urgency === 'HIGH') confidence += 0.1;
  if (text.length > 30) confidence += 0.1;

  const missing = [];
  if (!hasAddress) missing.push('address');
  if (!hasVehicle) missing.push('vehicle');

  return {
    type: detectedType,
    urgency,
    missing,
    confidence: Math.min(1, confidence),
    original_text: text.substring(0, 200),
  };
}

/**
 * Router principal
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/whatsapp/webhook') {
      return handleWhatsAppWebhook(request, env);
    } else if (path === '/whatsapp/messages') {
      return getWhatsAppMessages(request, env);
    } else if (path === '/whatsapp/validate') {
      return validateWhatsAppResponse(request, env);
    } else if (path === '/whatsapp/send') {
      return sendWhatsAppMessage(request, env);
    }

    return new Response('Not found', { status: 404 });
  },
};
