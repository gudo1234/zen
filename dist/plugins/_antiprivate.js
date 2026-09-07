import { getBotSettings, getPrefix } from "../lib/db.js";
export default {
    name: "antiprivate",
    before: async (m, { conn, prefijo, isOwner, isROwner }) => {
        if (m.isGroup)
            return;
        if (!m.chat?.endsWith("@s.whatsapp.net"))
            return;
        if (!m.originalText)
            return;
        if (m.fromMe)
            return;
        const botId = conn.user?.id?.split(":")[0];
        if (!botId)
            return;
        let settings;
        try {
            settings = await getBotSettings(botId);
        }
        catch (e) {
            console.error("❌ Error leyendo bot_settings:", e);
            return;
        }
        if (!settings.anti_private)
            return;
        if (isOwner || isROwner)
            return;
        const prefix = await getPrefix(botId);
        const text = m.originalText.trim();
        const isCodeCmd = text.startsWith(`${prefijo}code`) || text.startsWith("/code");
        if (isCodeCmd)
            return; // ⬅️ PERMITIDO
        //await conn.sendMessage(m.chat, { text: "🚫 *No escribas al privado.*\nSolo el comando *code* está permitido aquí." }, { quoted: m })
        console.log(`[ MSG ] ${m.sender} mando un mensaje ignorando anti-private activo`);
        return true; // ⛔ corta TODO
    }
};
