import { db } from "../lib/db.js";
export default {
    name: ["warns", "verwarn"],
    help: "warns",
    desc: "Mostrar las advertencias actuales de un usuario.",
    tags: ["group"],
    group: true,
    run: async ({ conn, m, args }) => {
        let user = m.mentionedJid?.[0] || m.quoted?.sender;
        if (!user && args[0]) {
            const num = args[0].replace(/[^0-9]/g, "");
            user = `${num}@s.whatsapp.net`;
        }
        if (!user)
            return m.reply("⚠️ Etiqueta o responde al usuario.");
        const group = m.chat;
        const res = await db.query(`
SELECT warns FROM warn_status
WHERE user_id=$1 AND group_id=$2
`, [user, group]);
        const warns = res.rows[0]?.warns || 0;
        const limitRes = await db.query(`
SELECT warn_limit FROM chats WHERE group_id=$1
`, [group]);
        const limit = limitRes.rows[0]?.warn_limit || 3;
        await conn.sendMessage(m.chat, { text: `⚠️ *Advertencias*

👤 Usuario: @${user.split("@")[0]}
📊 Warns: *${warns}/${limit}*`, mentions: [user], contextInfo: {} }, { quoted: m });
    }
};
