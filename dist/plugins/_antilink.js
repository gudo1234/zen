import { db } from "../lib/db.js";
export default {
    name: "antilink",
    before: async (m, { conn }) => {
        if (!m.isGroup || !m.originalText)
            return;
        try {
            const res = await db.query("SELECT antilink, antilink_prohibited, antilink_allowed, antilink_warn FROM chats WHERE group_id = $1", [m.chat]);
            const config = res.rows[0];
            if (!config || !config.antilink)
                return;
            const prohibited = config.antilink_prohibited || [];
            const allowedLinks = config.antilink_allowed || [];
            const warnLimit = config.antilink_warn || 0;
            // Verificar si el enlace está permitido (whitelist)
            const isAllowed = allowedLinks.some((link) => {
                return m.originalText.toLowerCase().includes(link);
            });
            if (isAllowed)
                return;
            // Verificar enlaces prohibidos (SOLO DE DB)
            const isProhibited = prohibited.some((link) => {
                return m.originalText.toLowerCase().includes(link);
            });
            if (!isProhibited)
                return;
            const metadata = await conn.groupMetadata(m.chat);
            const botId = conn.user?.id?.replace(/:\d+@/, "@");
            const isBotAdmin = metadata.participants.some(p => {
                const pid = p.id?.replace(/:\d+/, "");
                return (pid === botId || pid === (conn.user?.lid || "").replace(/:\d+/, "")) && p.admin;
            });
            const senderVariants = [m.sender, m.lid].filter(Boolean).map(j => j.replace(/:\d+/, ""));
            const isSenderAdmin = metadata.participants.some(p => {
                const pid = p.id?.replace(/:\d+/, "");
                return senderVariants.includes(pid) && p.admin;
            });
            if (isSenderAdmin || m.fromMe)
                return;
            if (conn.groupInviteCode) {
                try {
                    const code = await conn.groupInviteCode(m.chat);
                    if (m.originalText.includes(`https://chat.whatsapp.com/${code}`))
                        return;
                }
                catch { }
            }
            if (!isBotAdmin) {
                return conn.sendMessage(m.chat, {
                    text: `*「 ANTILINK DETECTADO 」*\n\n@${m.sender.split("@")[0]}, enviaste un link prohibido pero no puedo eliminarte porque no soy admin.`,
                    mentions: [m.sender]
                }, { quoted: m });
            }
            // SISTEMA DE ADVERTENCIAS
            if (warnLimit > 0) {
                const warnRes = await db.query("SELECT warns FROM antilink_warns WHERE group_id = $1 AND user_id = $2", [m.chat, m.sender]);
                let warns = warnRes.rows.length ? warnRes.rows[0].warns : 0;
                warns++;
                if (warns < warnLimit) {
                    await db.query(`INSERT INTO antilink_warns (group_id, user_id, warns) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (group_id, user_id) 
       DO UPDATE SET warns = $3`, [m.chat, m.sender, warns]);
                    await conn.sendMessage(m.chat, {
                        text: `*「 ANTILINK DETECTADO 」*\n\n@${m.sender.split("@")[0]}, enviaste un link prohibido.\n\n⚠️ Advertencia ${warns}/${warnLimit}\n\n> *No rompas las reglas o serás eliminado.*`,
                        mentions: [m.sender]
                    }, { quoted: m });
                    await conn.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: false, id: m.key.id, participant: m.key.participant || m.sender } });
                    return;
                }
            }
            // Eliminar al usuario
            await conn.sendMessage(m.chat, {
                text: `*「 ANTILINK DETECTADO 」*\n\n@${m.sender.split("@")[0]}, rompiste las reglas del grupo y serás eliminado.`,
                mentions: [m.sender]
            }, { quoted: m });
            try {
                await conn.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: false, id: m.key.id, participant: m.key.participant || m.sender } });
                await conn.groupParticipantsUpdate(m.chat, [m.sender], "remove");
                await db.query("DELETE FROM antilink_warns WHERE group_id = $1 AND user_id = $2", [m.chat, m.sender]);
            }
            catch (err) {
                console.error("❌ Error eliminando por antilink:", err);
            }
        }
        catch (e) {
            console.error("❌ Error consultando DB antilink:", e);
            return;
        }
    }
};
