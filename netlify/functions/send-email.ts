import type { Handler } from "@netlify/functions";

// Appel REST EmailJS (server-to-server)
const EMAILJS_ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send";

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }
    if (!event.body) {
      return { statusCode: 400, body: "Requête vide" };
    }

    const { to, subject, filename, contentBase64 } = JSON.parse(event.body);

    if (!to || !filename || !contentBase64) {
      return { statusCode: 400, body: "Champs manquants (to/filename/contentBase64)" };
    }

    const service_id   = process.env.EMAILJS_SERVICE_ID;
    const template_id  = process.env.EMAILJS_TEMPLATE_ID;
    const public_key   = process.env.EMAILJS_PUBLIC_KEY;   // appelé "user ID" dans EmailJS
    const private_key  = process.env.EMAILJS_PRIVATE_KEY;  // recommandé côté serveur

    if (!service_id || !template_id || !public_key) {
      return { statusCode: 500, body: "Variables d’env EMAILJS manquantes" };
    }

    // Le payload pour EmailJS
    // NB: pour l’attachement, EmailJS accepte un tableau d’objets { name, data }
    //     où data est un DataURL base64. On préfixe donc le base64.
    const dataUrl =
      "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," +
      contentBase64;

    const payload = {
      service_id,
      template_id,
      user_id: public_key,
      template_params: {
        // Ces clés doivent exister dans ton template EmailJS
        to_email: to,
        subject: subject || "Nouvelle commande",
        message: "Commande en pièce jointe (fichier Excel).",
      },
      // Pièces jointes
      attachments: [
        {
          name: filename,
          data: dataUrl,
        },
      ],
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    // Si tu as un PRIVATE KEY EmailJS, utilise l'auth Bearer (recommandé côté serveur)
    if (private_key) {
      headers["Authorization"] = `Bearer ${private_key}`;
    }

    const res = await fetch(EMAILJS_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { statusCode: 502, body: `EmailJS error: ${res.status} ${txt}` };
    }

    return { statusCode: 200, body: "Email envoyé ✅ via EmailJS" };
  } catch (e: any) {
    console.error(e);
    return { statusCode: 500, body: e?.message || "Erreur serveur" };
  }
};