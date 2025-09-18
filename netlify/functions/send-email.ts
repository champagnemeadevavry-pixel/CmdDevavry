import type { Handler } from "@netlify/functions";
import * as emailjs from "@emailjs/nodejs";

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { to, subject, filename, contentBase64, message } = JSON.parse(event.body || "{}");

    // Champs requis : adapte selon ton choix (To Email dynamique ou fixe dans le template)
    if (!subject || !filename || !contentBase64) {
      return { statusCode: 400, body: "Champs manquants (subject/filename/contentBase64)" };
    }

    const serviceID  = process.env.EMAILJS_SERVICE_ID!;
    const templateID = process.env.EMAILJS_TEMPLATE_ID!; // template_2vhncdl
    const publicKey  = process.env.EMAILJS_PUBLIC_KEY!;
    const privateKey = process.env.EMAILJS_PRIVATE_KEY;

    // Si tu as mis {{to_email}} dans le template, on le passe. Sinon, enlève to_email ci-dessous.
    const templateParams: Record<string, any> = {
      to_email: to || "champagnemeadevavry@gmail.com",      // valeur par défaut
      subject,
      message: message || "Commande ci-jointe (fichier Excel).",
      attachment: {
        name: filename,
        data:
          "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," +
          contentBase64,
      },
    };

    const res = await emailjs.send(serviceID, templateID, templateParams, { publicKey, privateKey });

    return { statusCode: 200, body: JSON.stringify(res) };
  } catch (err: any) {
    console.error(err);
    return { statusCode: 500, body: err?.message || "Erreur EmailJS" };
  }
};
