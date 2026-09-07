import { db } from "../lib/db.js";
export default {
    name: ["setpromote", "setdemote"],
    help: ["setpromote <texto>", "setdemote <texto>"],
    desc: "Personaliza los mensajes de ascenso o descenso de administradores.",
    tags: ["grupo"],
    group: true,
    admin: true,
    register: true,
    run: async ({ conn, m, args, text, prefijo, cmd }) => {
        const chatId = m.chat;
        const ejemplo = cmd === "setpromote" ? `${prefijo}setpromote @user ahora es admin 🚀` : `${prefijo}setdemote @user ya no es admin 😔`;
        if (!text)
            return m.reply(`${m.e.warn} Usa:\n${ejemplo}`);
        if (cmd === "setpromote") {
            await db.query(`INSERT INTO chats (group_id, sPromote)
         VALUES ($1, $2)
         ON CONFLICT (group_id) DO UPDATE SET sPromote = $2`, [chatId, text.trim()]);
            await m.reply(`✅ Mensaje de *ascenso* actualizado:\n\n📜 ${text}`);
        }
        else if (cmd === "setdemote") {
            await db.query(`INSERT INTO chats (group_id, sDemote)
         VALUES ($1, $2)
         ON CONFLICT (group_id) DO UPDATE SET sDemote = $2`, [chatId, text.trim()]);
            await m.reply(`✅ Mensaje de *descenso* actualizado:\n\n📜 ${text}`);
        }
    }
};
