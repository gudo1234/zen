export default {
    name: ["subirstatus", "subirestado"],
    help: "subirestado",
    tags: ["tools"],
    desc: "Subir estado etiquetando grupos",
    group: true,
    register: true,
    run: async ({ conn, m, text, prefijo, cmd, isOwner }) => {
        if (!text && !m.quoted)
            return m.reply(`⚠️ *\`USO INVÁLIDO\`*
  
*□ Usar de la siguientes maneras:*

👤 *Admin del grupo*
• ${prefijo + cmd} texto
• Responde a una imagen/video/audio con: ${prefijo + cmd}

> 👉 Publica estado etiquetando ESTE grupo

👑 *Owner / Premium*
• ${prefijo + cmd} texto | id,id,id
• ${prefijo + cmd} texto | link,link

> 📌 Máx 5 grupos por estado`);
        // ───── 1. SOLO ADMINS ─────
        const meta = await conn.groupMetadata(m.chat);
        const user = meta.participants.find(p => p.id === m.sender || p.lid === m.sender);
        if (!user?.admin && !isOwner) {
            return m.reply("❌ Solo admins pueden usar este comando");
        }
        // ───── 2. OBTENER JIDS A ETIQUETAR ─────
        let jids = [];
        if (isOwner && text?.includes("|")) {
            // owner: texto | ids/links
            const [, raw] = text.split("|");
            jids = raw
                .split(",")
                .map(v => v.trim())
                .map(v => {
                // link de grupo → id
                if (v.includes("chat.whatsapp.com")) {
                    const code = v.split("/").pop();
                    return conn.groupInviteCodeToJid(code);
                }
                return v;
            });
        }
        else {
            // admin normal → solo su grupo
            jids = [m.chat];
        }
        // resolver promesas (links)
        jids = (await Promise.all(jids)).filter(Boolean).slice(0, 5);
        if (!jids.length)
            return m.reply("❌ No hay grupos válidos");
        // ───── 3. DETECTAR FUENTE DEL MEDIA ─────
        const mediaMsg = m.quoted || m;
        let content;
        const caption = text?.split("|")[0]?.trim() || "";
        // ───── 4. CONSTRUIR CONTENIDO SEGÚN ROL ─────
        if (isOwner && text?.includes("|")) {
            // ── OWNER: usar sendStatusMentions para múltiples grupos ──
            if (mediaMsg.mimetype === "image") {
                content = {
                    image: await mediaMsg.download(),
                    caption
                };
            }
            else if (mediaMsg.mimetype === "video") {
                content = {
                    video: await mediaMsg.download(),
                    caption
                };
            }
            else if (mediaMsg.mimetype === "audio") {
                content = {
                    audio: await mediaMsg.download(),
                    mimetype: "audio/mp4",
                    ptt: true
                };
            }
            else {
                // TEXTO PURO
                content = {
                    text: caption || "👋 Estado del grupo",
                    font: 2,
                    textColor: 'FF0000',
                    backgroundColor: '#000000'
                };
            }
            await conn.sendStatusMentions(content, jids);
        }
        else {
            // ── ADMIN NORMAL: usar groupStatus: true en el grupo actual ──
            if (mediaMsg.mimetype === "image") {
                content = {
                    image: await mediaMsg.download(),
                    caption: caption || "👥 ¡Estado de Grupo!",
                    groupStatus: true
                };
            }
            else if (mediaMsg.mimetype === "video") {
                content = {
                    video: await mediaMsg.download(),
                    caption: caption || "👥 ¡Estado de Grupo!",
                    groupStatus: true
                };
            }
            else if (mediaMsg.mimetype === "audio") {
                content = {
                    audio: await mediaMsg.download(),
                    mimetype: "audio/mp4",
                    ptt: true,
                    groupStatus: true
                };
            }
            else {
                // TEXTO PURO
                content = {
                    text: caption || "👥 ¡Estado de Grupo!",
                    groupStatus: true
                };
            }
            await conn.sendMessage(m.chat, content);
        }
        m.react("✅");
        m.reply("*✅ Estado subido con éxito. Asegúrate de que el bot está en tu lista de contactos y viceversa para visualizar los estados.*");
    }
};
