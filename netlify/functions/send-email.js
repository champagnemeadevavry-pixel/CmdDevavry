// netlify/functions/send-email.js

// Cette fonction reçoit { to, subject, filename, contentBase64 } depuis le front,
// puis envoie un email via l'API Resend avec le fichier Excel en pièce jointe.

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { to, subject, filename, contentBase64 } = JSON.parse(event.body || "{}");
    if (!to || !filename || !contentBase64) {
      return { statusCode: 400, body: "Missing to/filename/contentBase64" };
    }

    const apiKey = process.env.RESEND_API_KEY; // ✅ à définir dans Netlify
    const from = process.env.RESEND_FROM;       // ✅ expéditeur vérifié chez Resend
    if (!apiKey || !from) {
      return { statusCode: 500, body: "Missing RESEND_API_KEY or RESEND_FROM" };
    }

    // Envoi via l’API Resend — https://resend.com
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,                 // ex: "no-reply@ton-domaine.com" (domaine vérifié)
        to: [to],
        subject: subject || "Commande",
        text: "Veuillez trouver la commande en pièce jointe.",
        attachments: [
          {
            filename,
            content: contentBase64, // base64 du .xlsx généré côté front
          },
        ],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return { statusCode: 502, body: `Resend error: ${text}` };
    }

    return { statusCode: 200, body: "Sent" };
  } catch (e) {
    return { statusCode: 500, body: String(e) };
  }
}
