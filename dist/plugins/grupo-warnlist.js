import { db } from "../lib/db.js";
export default {
    name: ["listwarn", "warnlist"],
    help: "listwarn",
    desc: "Mostrar la lista de usuarios con advertencias en el grupo.",
    tags: ["group"],
    group: true,
    admin: true,
    run: async ({ conn, m, args, prefijo }) => {
        const group = m.chat;
        const pageSize = 10;
        const page = Math.max(1, parseInt(args[0]) || 1);
        const offset = (page - 1) * pageSize;
        const totalRes = await db.query(`SELECT COUNT(*)::int AS total
       FROM warn_status
       WHERE group_id = $1 AND warns > 0`, [group]);
        const total = totalRes.rows[0]?.total || 0;
        if (total < 1) {
            return m.reply("✅ No hay usuarios con advertencias en este grupo.");
        }
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        if (page > totalPages) {
            return m.reply(`⚠️ Esa página no existe.\n\nTotal de páginas: *${totalPages}*`);
        }
        const res = await db.query(`SELECT user_id, warns
       FROM warn_status
       WHERE group_id = $1 AND warns > 0
       ORDER BY warns DESC, user_id ASC
       LIMIT $2 OFFSET $3`, [group, pageSize, offset]);
        const limitRes = await db.query(`SELECT warn_limit
       FROM chats
       WHERE group_id = $1
       LIMIT 1`, [group]);
        const limit = limitRes.rows[0]?.warn_limit || 3;
        let text = `*📋 LISTA DE ADVERTENCIAS 📋*\n\n`;
        text += `📄 Página: *${page}/${totalPages}*\n`;
        text += `👥 Usuarios con warns: *${total}*\n`;
        text += `🚫 Límite del adv: *${limit}*\n\n`;
        const mentions = [];
        for (let i = 0; i < res.rows.length; i++) {
            const row = res.rows[i];
            const user = row.user_id;
            const warns = row.warns;
            const index = offset + i + 1;
            mentions.push(user);
            text += `${index}. @${user.split("@")[0]} - Advertencias: *${warns}/${limit}*\n\n`;
        }
        text += `> Usa *${prefijo}listwarn ${page + 1}* para ver la siguiente página`;
        await conn.sendMessage(group, {
            text,
            mentions, contextInfo: {}
        }, { quoted: m });
    }
};
