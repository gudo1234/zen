import { db } from "../lib/db.js";
export default {
    name: ["setwelcome"],
    help: ["setwelcome <texto> [-foto]"],
    desc: "Personaliza el mensaje de bienvenida del grupo.",
    tags: ["grupo"],
    group: true,
    admin: true,
    register: true,
    run: async ({ conn, m, text, args, prefijo, cmd }) => {
        const chatId = m.chat;
        if (!text)
            return m.reply(`${m.e.warn} Usa: ${prefijo + cmd} <texto> [-foto]\n\nEjemplo:\n${prefijo + cmd} Bienvenido @user a @group\n${prefijo + cmd} Hola @user disfruta el grupo -foto`);
        const withPhoto = text.includes("-foto") || text.includes("-photo");
        const cleanText = text.replace(/-foto|-photo/gi, "").trim();
        await db.query(`INSERT INTO chats (group_id, sWelcome, photoWelcome)
       VALUES ($1, $2, $3)
       ON CONFLICT (group_id) DO UPDATE SET sWelcome = $2, photoWelcome = $3`, [chatId, cleanText, withPhoto]);
        await m.reply(`✅ Mensaje de bienvenida actualizado correctamente.\n📜 *Texto:* ${cleanText || "(vacío)"}\n🖼️ *Con foto:* ${withPhoto ? "Sí 📸" : "No 🚫"}`);
    }
};
