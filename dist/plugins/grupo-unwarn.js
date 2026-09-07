import { db } from "../lib/db.js";
export default {
    name: ["unwarn", "delwarn", "removewarn"],
    help: "unwarn",
    desc: "Remover una advertencia a un usuario.",
    tags: ["group"],
    group: true,
    admin: true,
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
        if (!res.rows.length || res.rows[0].warns <= 0) {
            return m.reply("⚠️ Ese usuario no tiene advertencias.");
        }
        const warns = res.rows[0].warns - 1;
        if (warns <= 0) {
            await db.query(`
DELETE FROM warn_status
WHERE user_id=$1 AND group_id=$2
`, [user, group]);
            return conn.sendMessage(group, { text: `✅ Advertencias eliminadas para @${user.split("@")[0]}`, mentions: [user], contextInfo: {} }, { quoted: m });
        }
        await db.query(`
UPDATE warn_status
SET warns=$1
WHERE user_id=$2 AND group_id=$3
`, [warns, user, group]);
        conn.sendMessage(group, { text: `✅ Advertencia removida

👤 Usuario: @${user.split("@")[0]}
⚠️ Warns actuales: ${warns}`, mentions: [user], contextInfo: {} }, { quoted: m });
    }
};
