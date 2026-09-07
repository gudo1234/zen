export default {
    name: "inspect",
    help: ["inspect <link o id>"],
    desc: "Obtiene la información de un grupo o canal de WhatsApp.",
    tags: ["tools"],
    register: true,
    run: async ({ conn, m, args, prefijo, cmd }) => {
        const input = args[0];
        if (!input)
            return m.reply(`${m.e.warn} *Debes proporcionar un enlace de un canal o grupos.*\nEjemplo: ${prefijo + cmd} https://whatsapp.com/channel/...`);
        await m.react("⌛");
        try {
            const isChannel = /whatsapp\.com\/channel\//i.test(input);
            const isGroupLink = /chat\.whatsapp\.com\//i.test(input);
            const isGroupId = input.endsWith("@g.us");
            let infoText = "";
            let thumb = null;
            if (isChannel) {
                const invite = input.split("/channel/")[1]?.split(/[?#]/)[0];
                if (!invite)
                    return m.reply(m.e.error + " No pude extraer el código del canal.");
                const data = await conn.newsletterMetadata("invite", invite);
                const meta = data.thread_metadata;
                infoText += `📢 *INFORMACIÓN DEL CANAL*\n\n`;
                infoText += `📛 *Nombre:* ${meta.name?.text || "Desconocido"}\n`;
                infoText += `🆔 *ID:* ${data.id}\n`;
                infoText += `🔖 *Estado:* ${data.state?.type || "Desconocido"}\n`;
                infoText += `✅ *Verificación:* ${meta.verification || "Desconocido"}\n`;
                infoText += `🗓️ *Creado:* ${new Date(Number(meta.creation_time) * 1000).toLocaleString("es-AR")}\n`;
                infoText += `👥 *Suscriptores:* ${meta.subscribers_count || "?"}\n`;
                infoText += `🔗 *Invitación:* https://whatsapp.com/channel/${meta.invite}\n`;
                infoText += `⚙️ *Handle:* ${meta.handle || "No asignado"}\n`;
                infoText += `⚙️ *Settings:* ${meta.settings ? JSON.stringify(meta.settings) : "No disponibles"}\n\n`;
                if (meta.description?.text)
                    infoText += `📄 *Descripción:*\n${meta.description.text.trim()}\n`;
                thumb = meta.preview?.direct_path ? `https://mmg.whatsapp.net${meta.preview.direct_path}` : null;
                if (thumb) {
                    await conn.sendMessage(m.chat, { image: { url: thumb }, caption: infoText.trim() }, { quoted: m });
                }
                else {
                    await conn.sendMessage(m.chat, { text: infoText.trim() }, { quoted: m });
                }
                await m.reply(data.id);
                await m.react("✅");
                return;
            }
            // ===== GRUPOS =====
            if (isGroupLink || isGroupId) {
                let groupId = input;
                if (isGroupLink) {
                    const code = input.split("chat.whatsapp.com/")[1]?.split(/[?#]/)[0];
                    if (!code)
                        return m.reply(m.e.error + " No pude extraer el código del grupo.");
                    const resolve = await conn.groupGetInviteInfo(code);
                    if (!resolve?.id)
                        return m.reply(m.e.error + " No se pudo resolver el ID del grupo.");
                    const data = resolve;
                    const totalAdmins = data.participants?.filter(p => p.admin).length || 0;
                    const totalMembers = data.participants?.length || 0;
                    // 🔥 LIMPIAR CREADOR (solo número sin @s.whatsapp.net)
                    const creatorRaw = data.ownerPn || data.owner || "Desconocido";
                    const creatorClean = creatorRaw.split('@')[0] || creatorRaw;
                    // 🔥 CONVERTIR TIEMPO A FORMATO LEGIBLE
                    let tiempoTemp = "Desactivado";
                    if (data.ephemeralDuration) {
                        const seg = data.ephemeralDuration;
                        if (seg < 60)
                            tiempoTemp = `${seg} segundos`;
                        else if (seg < 3600)
                            tiempoTemp = `${Math.floor(seg / 60)} minutos`;
                        else if (seg < 86400)
                            tiempoTemp = `${Math.floor(seg / 3600)} horas`;
                        else
                            tiempoTemp = `${Math.floor(seg / 86400)} días`;
                    }
                    infoText += `👥 *INFORMACIÓN DEL GRUPO*\n\n`;
                    infoText += `📛 *Nombre:* ${data.subject || "Desconocido"}\n`;
                    infoText += `🆔 *ID:* ${data.id}\n`;
                    infoText += `👑 *Creador:* @${creatorClean}\n`;
                    infoText += `📅 *Creado:* ${data.creation ? new Date(data.creation * 1000).toLocaleString("es-AR") : "Desconocido"}\n`;
                    infoText += `👥 *Miembros:* ${totalMembers}\n`;
                    infoText += `🛡️ *Admins:* ${totalAdmins}\n`;
                    infoText += `💬 *Descripción:* ${data.desc || "Sin descripción"}\n`;
                    infoText += `⚙️ *Restrict:* ${data.restrict ? "✅ Activado" : "❌ Desactivado"}\n`;
                    infoText += `📢 *Open/close?:* ${data.announce ? "Grupo cerrado" : "Grupos abiertos"}\n`;
                    infoText += `👥 *Aprobación al unirse:* ${data.joinApprovalMode ? "✅ Sí" : "❌ No"}\n`;
                    infoText += `➕ *Agregar miembros:* ${data.memberAddMode ? "✅ Sí" : "❌ No"}\n`;
                    infoText += `💾 *Mensajes temporales:* ${tiempoTemp}\n`;
                    infoText += `🏠 *Comunidad:* ${data.isCommunity ? "✅" : "❌"}\n`;
                    infoText += `📣 *Anuncio comunitario:* ${data.isCommunityAnnounce ? "✅" : "❌"}\n\n`;
                    infoText += `🔗 *Link:* ${input}`;
                    try {
                        thumb = await conn.profilePictureUrl(data.id, 'image');
                    }
                    catch (e) {
                        thumb = null;
                    }
                    const mentions = creatorClean ? [`${creatorClean}@s.whatsapp.net`] : [];
                    if (thumb) {
                        await conn.sendMessage(m.chat, {
                            image: { url: thumb },
                            caption: infoText.trim(),
                            contextInfo: { mentionedJid: mentions }
                        }, { quoted: m });
                    }
                    else {
                        await conn.sendMessage(m.chat, {
                            text: infoText.trim(),
                            contextInfo: { mentionedJid: mentions }
                        }, { quoted: m });
                    }
                    await m.react("✅");
                    return;
                }
            }
        }
        catch (e) {
            console.error("❌ Error en inspect:", e);
            await m.react("❌");
            await m.reply(`${m.e.error + m.msg.error}\n\n >>> ${e.message || e} <<<< `);
        }
    }
};
