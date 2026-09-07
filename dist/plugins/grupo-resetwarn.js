import { db } from "../lib/db.js";
export default {
    name: ["resetwarn", "clearwarnuser"],
    help: "resetwarn",
    desc: "Reiniciar advertencias de un usuario.",
    tags: ["group"],
    group: true,
    admin: true,
    run: async ({ conn, m, args }) => {
        /*let user = m.mentionedJid?.[0] || m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || m.quoted?.sender || m.sender
        
        // ===== PARCHE LID SIMPLE =====
        if (user && user.endsWith("@lid")) {
        const meta = await conn.groupMetadata(m.chat)
        const participant = meta.participants.find(p => p.lid === user || p.id === user)
        
        if (participant?.id) {
        user = participant.id
        } else {
        user = user.replace(/@lid$/, "") + "@s.whatsapp.net"
        }}*/
        let user = m.mentionedJid?.[0] || m.quoted?.sender;
        if (!user && args[0]) {
            const num = args[0].replace(/[^0-9]/g, "");
            user = `${num}@s.whatsapp.net`;
        }
        if (!user) {
            return m.reply("⚠️ Etiqueta o responde al usuario.");
        }
        const group = m.chat;
        const res = await db.query(`
SELECT warns
FROM warn_status
WHERE user_id=$1 AND group_id=$2
`, [user, group]);
        if (!res.rows.length) {
            return m.reply("⚠️ Ese usuario no tiene advertencias.");
        }
        await db.query(`
DELETE FROM warn_status
WHERE user_id=$1 AND group_id=$2
`, [user, group]);
        await conn.sendMessage(group, { text: `✅ Advertencias reiniciadas

👤 Usuario: @${user.split("@")[0]}
⚠️ Warns: 0`, mentions: [user], contextInfo: {} }, { quoted: m });
    }
};
