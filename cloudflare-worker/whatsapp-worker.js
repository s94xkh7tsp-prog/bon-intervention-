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

const META_WEBHOOK_TOKEN = 'YOUR_META_WEBHOOK_TOKEN'; // À configurer en env secret
const META_PHONE_NUMBER_ID = 'YOUR_PHONE_NUMBER_ID';  // À configurer
const META_BUSINESS_ACCOUNT_ID = 'YOUR_BUSINESS_ACCOUNT_ID'; // À configurer
const META_ACCESS_TOKEN = 'YOUR_META_ACCESS_TOKEN'; // À configurer en env secret

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
    
    if (mode === 'subscribe' && token === META_WEBHOOK_TOKEN) {
      return new Response(challenge);
    }
    return new Response('Forbidden', { status: 403 });
  }

  // POST : traiter les messages entrants
  if (request.method === 'POST') {
    const body = await request.json();
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
        INSERT INTO whatsapp_messages 
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

  const { message_id, response_text, validated_data } = await request.json();

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
export async function sendWhatsAppMessage(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { message_id } = await request.json();

  // Récupérer le message
  const msg = await env.DB.prepare(`
    SELECT id, from_number, response_draft, status
    FROM whatsapp_messages
    WHERE id = ? AND status = 'READY_TO_SEND'
  `).bind(message_id).first();

  if (!msg) {
    return new Response(JSON.stringify({ error: 'Message not found or not ready' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Appel à l'API Meta pour envoyer
  const metaResponse = await fetch(
    `https://graph.instagram.com/v18.0/${META_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: msg.from_number,
        type: 'text',
        text: { body: msg.response_draft },
      }),
    }
  );

  const metaResult = await metaResponse.json();

  if (metaResult.messages) {
    // Succès
    await env.DB.prepare(`
      UPDATE whatsapp_messages
      SET status = ?, sent_at = ?, meta_msg_id = ?
      WHERE id = ?
    `).bind(
      'SENT',
      new Date().toISOString(),
      metaResult.messages[0].id,
      message_id
    ).run();

    return new Response(JSON.stringify({ success: true, meta_id: metaResult.messages[0].id }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } else {
    // Erreur
    return new Response(
      JSON.stringify({ error: 'Meta API error', details: metaResult }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
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
