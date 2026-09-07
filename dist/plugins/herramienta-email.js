import fetch from "node-fetch";
import { db } from "../lib/db.js";
function formatDate(dateStr = "") {
    if (!dateStr)
        return "No disponible";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
        return dateStr;
    }
    return d.toLocaleString("es-AR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}
function cleanHtml(html = "") {
    return String(html)
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<\/li>/gi, "\n")
        .replace(/<li>/gi, "• ")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
async function getSavedTempMail(userId) {
    const res = await db.query(`SELECT email, token, deleted_in
     FROM tempmail_users
     WHERE user_id = $1
     LIMIT 1`, [userId]);
    return (res.rows?.[0] || null);
}
async function saveTempMail(userId, email, token, deletedIn) {
    await db.query(`INSERT INTO tempmail_users (
      user_id,
      email,
      token,
      deleted_in,
      updated_at
    )
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      email = EXCLUDED.email,
      token = EXCLUDED.token,
      deleted_in = EXCLUDED.deleted_in,
      updated_at = NOW()`, [
        userId,
        email,
        token,
        deletedIn || null
    ]);
}
async function deleteTempMail(userId) {
    await db.query(`DELETE FROM tempmail_users WHERE user_id = $1`, [userId]);
}
export default {
    name: [
        "tempmail",
        "correo_temp",
        "tempcorreio"
    ],
    help: ["tempmail"],
    desc: "Crear y revisar correo temporal",
    tags: ["tools"],
    register: true,
    run: async ({ conn, m, text, prefijo, cmd }) => {
        const args = String(text || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean);
        const subcmd = String(args?.[0] || "").toLowerCase();
        const userId = m.sender;
        if (!subcmd) {
            return m.reply(`*📧 TEMPMAIL*\n\n` +
                `*Comandos:*\n` +
                `• *${prefijo + cmd} crear* → crear correo temporal\n` +
                `• *${prefijo + cmd} mensajes* → ver bandeja\n` +
                `• *${prefijo + cmd} leer <id>* → leer mensaje por ID\n` +
                `• *${prefijo + cmd} info* → ver correo guardado\n` +
                `• *${prefijo + cmd} reset* → borrar correo guardado\n\n` +
                `*Ejemplos:*\n` +
                `• *${prefijo + cmd} crear*\n` +
                `• *${prefijo + cmd} mensajes*\n` +
                `• *${prefijo + cmd} leer 12345*`);
        }
        await conn.sendPresenceUpdate("composing", m.chat);
        try {
            const apiKey = process.env.API_KEY || "";
            if (!apiKey) {
                throw new Error("Falta process.env.API_KEY");
            }
            // CREAR
            if (["crear", "create", "new"].includes(subcmd)) {
                const res = await fetch(`https://api.mitzuki.xyz/tools/tempail?action=create&apikey=${encodeURIComponent(apiKey)}`);
                const json = await res.json();
                if (!json?.status ||
                    !json?.data?.email ||
                    !json?.data?.token) {
                    throw new Error(json?.error ||
                        json?.message ||
                        "No se pudo crear el correo temporal");
                }
                await saveTempMail(userId, json.data.email, json.data.token, json.data.deleted_in);
                return m.reply(`*📧 CORREO TEMPORAL CREADO*\n\n` +
                    `*Email:* ${json.data.email}\n` +
                    `*Token:* \`${json.data.token}\`\n` +
                    `*Expira:* ${formatDate(json.data.deleted_in || "")}\n\n` +
                    `Usa *${prefijo + cmd} mensajes* para revisar la bandeja.`);
            }
            // INFO
            if (["info", "datos", "status"].includes(subcmd)) {
                const saved = await getSavedTempMail(userId);
                if (!saved) {
                    return m.reply(`${m.e?.warn || "⚠️"} No tienes ningún correo temporal guardado.\n\n` +
                        `Usa *${prefijo + cmd} crear*`);
                }
                return m.reply(`*📦 TEMPMAIL GUARDADO*\n\n` +
                    `*Email:* ${saved.email}\n` +
                    `*Token:* \`${saved.token}\`\n` +
                    `*Expira:* ${formatDate(saved.deleted_in || "")}`);
            }
            // MENSAJES
            if ([
                "mensajes",
                "msgs",
                "inbox",
                "bandeja",
                "messages"
            ].includes(subcmd)) {
                const saved = await getSavedTempMail(userId);
                if (!saved?.token) {
                    return m.reply(`${m.e?.warn || "⚠️"} No tienes correo temporal guardado.\n\n` +
                        `Usa *${prefijo + cmd} crear* primero.`);
                }
                const res = await fetch(`https://api.mitzuki.xyz/tools/tempail?action=messages&token=${encodeURIComponent(saved.token)}&apikey=${encodeURIComponent(apiKey)}`);
                const json = await res.json();
                if (!json?.status) {
                    if (String(json?.error || "").toLowerCase().includes("expirado")) {
                        await deleteTempMail(userId);
                    }
                    throw new Error(json?.error ||
                        json?.message ||
                        "No se pudieron obtener los mensajes");
                }
                const mailbox = json?.data?.mailbox ||
                    saved.email ||
                    "Desconocido";
                const messages = Array.isArray(json?.data?.messages)
                    ? json.data.messages
                    : [];
                if (!messages.length) {
                    return m.reply(`*📭 BANDEJA VACÍA*\n\n` +
                        `*Email:* ${mailbox}\n` +
                        `*Expira:* ${formatDate(saved.deleted_in || "")}\n\n` +
                        `Todavía no llegó ningún mensaje.`);
                }
                let out = `*📥 BANDEJA DE ENTRADA*\n\n` +
                    `*Email:* ${mailbox}\n` +
                    `*Mensajes:* ${messages.length}\n` +
                    `*Expira:* ${formatDate(saved.deleted_in || "")}\n\n`;
                for (let i = 0; i < Math.min(15, messages.length); i++) {
                    const x = messages[i];
                    out +=
                        `*${i + 1}.* ${x.subject || "Sin asunto"}\n` +
                            `• *ID:* ${x.id || "?"}\n` +
                            `• *De:* ${x.from || x.from_email || "Desconocido"}\n` +
                            `• *Fecha:* ${formatDate(x.receivedAt ||
                                x.received_at ||
                                x.created_at ||
                                "")}\n\n`;
                }
                out +=
                    `Para leer uno usa:\n` +
                        `*${prefijo + cmd} leer ID*`;
                return m.reply(out.trim());
            }
            // LEER
            if ([
                "leer",
                "read",
                "ver",
                "mensaje",
                "message"
            ].includes(subcmd)) {
                const id = String(args?.[1] || "");
                if (!id) {
                    return m.reply(`${m.e?.warn || "⚠️"} Falta el *id* del mensaje.\n\n` +
                        `Ejemplo:\n*${prefijo + cmd} leer 12345*`);
                }
                const saved = await getSavedTempMail(userId);
                if (!saved) {
                    return m.reply(`${m.e?.warn || "⚠️"} No tienes correo temporal guardado.\n\n` +
                        `Usa *${prefijo + cmd} crear* primero.`);
                }
                const res = await fetch(`https://api.mitzuki.xyz/tools/tempail?action=message&id=${encodeURIComponent(id)}&apikey=${encodeURIComponent(apiKey)}`);
                const json = await res.json();
                if (!json?.status || !json?.data) {
                    if (String(json?.error || "").toLowerCase().includes("expirado")) {
                        await deleteTempMail(userId);
                    }
                    throw new Error(json?.error ||
                        json?.message ||
                        "No se pudo leer el mensaje");
                }
                const msg = json.data;
                const content = cleanHtml(msg.content || "");
                let out = `*📩 MENSAJE TEMPMAIL*\n\n` +
                    `*ID:* ${msg.id || id}\n` +
                    `*Asunto:* ${msg.subject || "Sin asunto"}\n` +
                    `*De:* ${msg.from || "Desconocido"}\n` +
                    `*Correo:* ${msg.from_email || "No disponible"}\n` +
                    `*Recibido:* ${formatDate(msg.received_at || "")}\n` +
                    `*Visto:* ${msg.seen ? "Sí" : "No"}\n` +
                    `*Adjuntos:* ${Array.isArray(msg.attachments)
                        ? msg.attachments.length
                        : 0}\n\n` +
                    `*Contenido:*\n${content || "Sin contenido"}`;
                if (out.length > 3900) {
                    out =
                        out.slice(0, 3900) +
                            "\n\n...[mensaje recortado]";
                }
                return m.reply(out.trim());
            }
            // RESET
            if ([
                "reset",
                "clear",
                "borrar",
                "delete"
            ].includes(subcmd)) {
                await deleteTempMail(userId);
                return m.reply(`${m.e?.ok || "✅"} Tempmail borrado de la base de datos.`);
            }
            return m.reply(`${m.e?.warn || "⚠️"} Subcomando inválido.\n\n` +
                `Usa *${prefijo + cmd}* para ver cómo se usa.`);
        }
        catch (e) {
            console.error("❌ Error tempmail:", e);
            return m.reply(`${m.e?.error || "❌"} Error en tempmail.\n\n` +
                `> ${e?.message || e}`);
        }
    }
};
