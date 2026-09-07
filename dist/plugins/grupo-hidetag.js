export default {
    name: ["hidetag", "notificar", "notify", "n", "tag"],
    help: ["hidetag <texto o responde algo>"],
    desc: "Envía un mensaje o archivo mencionando a todos sin mostrar las etiquetas.",
    tags: ["grupo"],
    group: true,
    admin: true,
    run: async ({ conn, m, text, args, prefijo, cmd }) => {
        const metadata = await conn.groupMetadata(m.chat);
        const users = metadata.participants.map((u) => u.id);
        let caption = text?.trim() || "";
        const currentMsg = m.message || {};
        const currentType = Object.keys(currentMsg).find(key => ["imageMessage", "videoMessage", "audioMessage", "stickerMessage", "documentMessage"].includes(key));
        if (currentType) {
            try {
                const mediax = await m.download();
                const msg = { contextInfo: { mentionedJid: users } };
                switch (currentType) {
                    case "imageMessage":
                        msg.image = mediax;
                        if (caption)
                            msg.caption = caption;
                        break;
                    case "videoMessage":
                        msg.video = mediax;
                        if (caption)
                            msg.caption = caption;
                        break;
                    case "audioMessage":
                        msg.audio = mediax;
                        msg.ptt = true;
                        msg.fileName = "hidetag.mp3";
                        msg.mimetype = "audio/mp4";
                        break;
                    case "stickerMessage":
                        msg.sticker = mediax;
                        break;
                    case "documentMessage":
                        msg.document = mediax;
                        msg.fileName = m.fileName || "archivo";
                        msg.mimetype = m.mimetype || "application/octet-stream";
                        break;
                }
                await conn.sendMessage(m.chat, msg, { quoted: null });
                return;
            }
            catch (err) {
                console.error("❌ Error:", err);
                return m.reply("❌ Error al enviar el archivo.");
            }
        }
        if (m.quoted && m.quoted.message) {
            const quotedMsg = m.quoted.message || {};
            const quotedType = Object.keys(quotedMsg)[0];
            const isMedia = ["imageMessage", "videoMessage", "audioMessage", "stickerMessage", "documentMessage"].includes(quotedType);
            // 🔥 Obtener caption del mensaje citado si es imagen/video
            let quotedCaption = "";
            if (quotedType === "imageMessage")
                quotedCaption = quotedMsg.imageMessage?.caption || "";
            else if (quotedType === "videoMessage")
                quotedCaption = quotedMsg.videoMessage?.caption || "";
            else if (quotedType === "documentMessage")
                quotedCaption = quotedMsg.documentMessage?.caption || "";
            // 🔥 Prioridad: caption del texto > caption de la imagen citada > texto citado
            const finalCaption = caption || quotedCaption || quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || "";
            if (isMedia) {
                try {
                    const mediax = await m.quoted.download();
                    const msg = { contextInfo: { mentionedJid: users } };
                    switch (quotedType) {
                        case "imageMessage":
                            msg.image = mediax;
                            if (finalCaption)
                                msg.caption = finalCaption;
                            break;
                        case "videoMessage":
                            msg.video = mediax;
                            if (finalCaption)
                                msg.caption = finalCaption;
                            break;
                        case "audioMessage":
                            msg.audio = mediax;
                            msg.ptt = true;
                            msg.fileName = "hidetag.mp3";
                            msg.mimetype = "audio/mp4";
                            break;
                        case "stickerMessage":
                            msg.sticker = mediax;
                            break;
                        case "documentMessage":
                            msg.document = mediax;
                            msg.fileName = m.quoted.fileName || "archivo";
                            msg.mimetype = m.quoted.mimetype || "application/octet-stream";
                            break;
                    }
                    await conn.sendMessage(m.chat, msg, { quoted: null });
                    return;
                }
                catch (err) {
                    console.error("❌ Error:", err);
                }
            }
            if (!finalCaption)
                return m.reply(m.e.warn + " No encontré texto para enviar.");
            await conn.sendMessage(m.chat, { text: finalCaption, contextInfo: { mentionedJid: users } });
            return;
        }
        if (!caption)
            return m.reply(`${m.e.warn} Usa: ${prefijo + cmd} <texto> o responde a un mensaje.`);
        await conn.sendMessage(m.chat, { text: caption, contextInfo: { mentionedJid: users } });
    }
};
