import { db } from "../lib/db.js";
export default {
    name: "antistatus",
    before: async (m, { conn }) => {
        //const hasStatusV2 = m.message?.groupStatusMessageV2 || m.quoted?.message?.groupStatusMessageV2
        if (!m.isGroup)
            return;
        if (!m.message?.groupStatusMentionMessage && !m.message?.groupStatusMessageV2)
            return;
        try {
            const res = await db.query("SELECT antistatus FROM chats WHERE group_id = $1", [m.chat]);
            const config = res.rows[0];
            if (!config || !config.antistatus)
                return;
        }
        catch (err) {
            console.error("❌ AntiStatus DB error:", err);
            return;
        }
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
        if (!isBotAdmin)
            return conn.sendMessage(m.chat, { text: `*「 ANTI ESTADOS 」*\n\n🚫 Está activado, pero no soy admin así que no puedo borrar nada.`, mentions: [m.sender] }, { quoted: m });
        try {
            const user = m.sender;
            await conn.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: false, id: m.id, participant: user } });
            const warnRes = await db.query(`INSERT INTO warn_status (user_id, group_id, warns)
        VALUES ($1, $2, 1)
        ON CONFLICT (user_id, group_id)
        DO UPDATE SET warns = warn_status.warns + 1
        RETURNING warns`, [user, m.chat]);
            const warns = warnRes.rows[0].warns;
            if (warns < 3) {
                return conn.sendMessage(m.chat, { text: `*「 ANTI ESTADOS 」*\n\n@${m.sender.split("@")[0]}, deja de mencionar el grupo con tus estados de mrd, esto no es para tu spam.\n> Advertencia ${warns}/3`, mentions: [m.sender] }, { quoted: m });
            }
            await conn.groupParticipantsUpdate(m.chat, [user], "remove");
            await db.query(`DELETE FROM warn_status WHERE user_id = $1 AND group_id = $2`, [user, m.chat]);
            await conn.sendMessage(m.chat, { text: `*「 ANTI ESTADOS 」*\n\n🚫 @${m.sender.split("@")[0]}, se fue por pesado con los estados.`, mentions: [m.sender] }, { quoted: m });
        }
        catch (err) {
            console.error("❌ AntiStatus error:", err);
        }
    }
};
