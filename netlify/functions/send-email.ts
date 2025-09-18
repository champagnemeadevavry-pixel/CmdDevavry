import type { Handler } from "@netlify/functions";
import * as emailjs from "@emailjs/nodejs";

export const handler: Handler = async (event) => {
  try {
    const { to, subject, filename, contentBase64 } = JSON.parse(event.body || "{}");

    if (!to || !subject || !filename || !contentBase64) {
      return { statusCode: 400, body: "Champs manquants" };
    }

    const serviceID = process.env.EMAILJS_SERVICE_ID!;
    const templateID = process.env.EMAILJS_TEMPLATE_ID!; // = template_2vhncdl
    const publicKey = process.env.EMAILJS_PUBLIC_KEY!;
    const privateKey = process.env.EMAILJS_PRIVATE_KEY;

    const response = await emailjs.send(
      serviceID,
      templateID,
      {
        to_email: to,   // doit exister dans le template
        subject,        // idem
        message: "Commande ci-jointe",
        attachment: {
          name: filename,
          data:
            "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," +
            contentBase64,
        },
      },
      { publicKey, privateKey }
    );

    return { statusCode: 200, body: JSON.stringify(response) };
  } catch (err: any) {
    return { statusCode: 500, body: err.message || "Erreur EmailJS" };
  }
};
