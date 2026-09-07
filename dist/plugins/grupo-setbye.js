import { db } from "../lib/db.js";
export default {
    name: ["setbye"],
    help: ["setbye <texto> [-foto]"],
    desc: "Personaliza el mensaje de despedida del grupo.",
    tags: ["grupo"],
    group: true,
    admin: true,
    register: true,
    run: async ({ conn, m, text, args, prefijo, cmd }) => {
        const chatId = m.chat;
        if (!text)
            return m.reply(`${m.e.warn} Usa: ${prefijo + cmd} <texto> [-foto]\n\nEjemplo:\n${prefijo + cmd} Adiós @user, te extrañaremos 💔\n${prefijo + cmd} Hasta luego @user -foto`);
        const withPhoto = text.includes("-foto") || text.includes("-photo");
        const cleanText = text.replace(/-foto|-photo/gi, "").trim();
        await db.query(`INSERT INTO chats (group_id, sBye, photoBye)
       VALUES ($1, $2, $3)
       ON CONFLICT (group_id) DO UPDATE SET sBye = $2, photoBye = $3`, [chatId, cleanText, withPhoto]);
        await m.reply(`✅ Mensaje de despedida actualizado correctamente.\n📜 *Texto:* ${cleanText || "(vacío)"}\n🖼️ *Con foto:* ${withPhoto ? "Sí 📸" : "No 🚫"}`);
    }
};
