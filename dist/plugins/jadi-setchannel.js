import { setBotSettings, getBotSettings } from "../lib/db.js";
export default {
    name: ["setchannel", "setnewsletter"],
    help: ["setchannel <link> | [nombre]", "setnewsletter off"],
    desc: "Cambia o desactiva el canal que aparece en los mensajes forwardeados del bot.",
    tags: ["jadibot"],
    owner: true,
    run: async ({ conn, m, args, text, prefijo, cmd }) => {
        const botId = conn.user?.id?.split(":")[0] || "mainbot";
        if (!text && !m.quoted) {
            const settings = await getBotSettings(botId);
            const jid = settings.newsletter_jid || "off";
            const name = settings.newsletter_name || "";
            const isActive = jid && jid !== "" && jid !== "off";
            return m.reply(`📢 *CONFIGURACIÓN ACTUAL DEL CANAL*\n\n` +
                `📛 *Nombre:* ${isActive ? name : "-"}\n` +
                `🆔 *JID:* ${isActive ? jid : "-"}\n` +
                `📊 *Estado:* ${isActive ? "✅ Activo" : "❌ Desactivado"}\n\n` +
                `✏️ Para cambiar: ${prefijo + cmd} <link> | [nombre]\n` +
                `🚫 Para desactivar: ${prefijo + cmd} off\n` +
                `📌 Ejemplo: ${prefijo + cmd} https://whatsapp.com/channel/0029VagJ2FF4CrfrS8BoLW2b | "Mi canal oficial"`);
        }
        await m.react("⌛");
        try {
            if (text && text.toLowerCase().trim() === "off") {
                await setBotSettings(botId, {
                    newsletter_jid: "off",
                    newsletter_name: ""
                });
                await m.react("✅");
                return m.reply(`🚫 *Canal desactivado correctamente*\n\n` +
                    `El bot ya no mostrará información de canal en los mensajes forwardeados.`);
            }
            let newsletterJid = "";
            let newsletterName = "";
            const parts = text ? text.split("|").map(s => s.trim()) : [];
            const linkPart = parts[0] || "";
            const namePart = parts.length > 1 ? parts.slice(1).join(" | ") : "";
            if (m.quoted && m.quoted.key?.remoteJid?.endsWith("@newsletter")) {
                newsletterJid = m.quoted.key.remoteJid;
                newsletterName = namePart || args.slice(1).join(" ") || "Canal de WhatsApp";
                if (newsletterName === "Canal de WhatsApp") {
                    try {
                        const newsMeta = await conn.newsletterMetadata("jid", newsletterJid);
                        if (newsMeta?.thread_metadata?.name?.text) {
                            newsletterName = newsMeta.thread_metadata.name.text;
                        }
                    }
                    catch { }
                }
            }
            else if (linkPart && linkPart.includes("whatsapp.com/channel/")) {
                const code = linkPart.split("/channel/")[1]?.split(/[?#]/)[0];
                if (!code) {
                    return m.reply(m.e.error + " No pude extraer el código del canal.");
                }
                const data = await conn.newsletterMetadata("invite", code);
                if (!data?.id) {
                    return m.reply(m.e.error + " No se encontró el canal.");
                }
                newsletterJid = data.id;
                newsletterName = namePart || data.thread_metadata?.name?.text || args.slice(1).join(" ") || "Canal de WhatsApp";
                if (newsletterName === "Canal de WhatsApp") {
                    return m.reply(m.e.warn + " No pude obtener el nombre del canal.\nUsa: " + prefijo + cmd + " <link> | \"Nombre del canal\"");
                }
            }
            else if (linkPart && linkPart.includes("@newsletter")) {
                newsletterJid = linkPart;
                newsletterName = namePart || args.slice(1).join(" ") || "Canal de WhatsApp";
            }
            else {
                return m.reply(m.e.warn + ` Uso correcto:\n` +
                    `1️⃣ ${prefijo + cmd} <link> | [nombre]\n` +
                    `2️⃣ ${prefijo + cmd} off (para desactivar)\n` +
                    `3️⃣ ${prefijo + cmd} (respondiendo a mensaje de canal) | [nombre]\n\n` +
                    `📌 Ejemplo: ${prefijo + cmd} https://whatsapp.com/channel/0029VagJ2FF4CrfrS8BoLW2b | "Mi canal oficial"`);
            }
            await setBotSettings(botId, {
                newsletter_jid: newsletterJid,
                newsletter_name: newsletterName
            });
            await m.react("✅");
            await m.reply(`✅ *Canal actualizado correctamente*\n\n` +
                `📛 *Nombre:* ${newsletterName}\n` +
                `🆔 *JID:* ${newsletterJid}\n\n` +
                `🔁 Este canal aparecerá en los mensajes forwardeados del bot.`);
        }
        catch (e) {
            console.error("❌ Error en setchannel:", e);
            await m.react("❌");
            await m.reply(`${m.e.error} ${m.msg.error}\n\n >>> ${e.message || e} <<<`);
        }
    }
};
