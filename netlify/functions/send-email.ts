/// <reference types="node" />
// netlify/functions/send-email.ts
import type { Handler } from "@netlify/functions";
import * as emailjs from "@emailjs/nodejs";

/** Réponse JSON + CORS */
const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  },
  body: typeof body === "string" ? body : JSON.stringify(body),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, "OK"); // préflight CORS

  try {
    if (event.httpMethod !== "POST") return json(405, "Method Not Allowed");

    const { to, subject, filename, contentBase64, message } = JSON.parse(event.body || "{}");

    if (!subject || !filename || !contentBase64) {
      return json(400, "Champs manquants (subject/filename/contentBase64)");
    }

    // ⚙️ Variables d'env à définir dans Netlify
    const serviceID  = process.env.EMAILJS_SERVICE_ID;
    const templateID = process.env.EMAILJS_TEMPLATE_ID; // ex: template_2vhncdl
    const publicKey  = process.env.EMAILJS_PUBLIC_KEY;
    const privateKey = process.env.EMAILJS_PRIVATE_KEY; // (optionnel)

    if (!serviceID || !templateID || !publicKey) {
      return json(500, "Variables d’environnement EmailJS manquantes");
    }

    // Doit correspondre à tes placeholders EmailJS: {{to_email}}, {{subject}}, {{message}}
    const templateParams: Record<string, any> = {
      to_email: to || "champagnemeadevavry@gmail.com",
      subject,
      message: message || "Commande ci-jointe (fichier Excel).",
      // Pièce jointe en Data URL base64 supportée par EmailJS
      attachment: {
        name: filename,
        data:
          "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," +
          contentBase64,
      },
    };

    const res = await emailjs.send(serviceID, templateID, templateParams, {
      publicKey,
      privateKey,
    });

    return json(200, { ok: true, emailjsResponse: res });
  } catch (err: any) {
    console.error(err);
    return json(500, err?.message || "Erreur EmailJS");
  }
};
