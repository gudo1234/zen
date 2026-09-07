import { setBotSettings } from "../lib/db.js";
export default {
    name: "setbotname",
    help: ["setbotname <name>"],
    desc: "Cambia el nombre del bot",
    tags: ["jadibot"],
    owner: true,
    run: async ({ conn, m, body, prefijo, cmd }) => {
        const botId = conn.user?.id?.split(":")[0];
        const text = body.replace(/^setbotname\s*/i, "").trim();
        if (!text || text.length < 3)
            return m.reply(`${m.e?.warn || "⚠️"} Nombre inválido.\n\nUsa: ${prefijo + cmd} <nombre>\nEjemplo: ${prefijo + cmd} LoliBot`);
        try {
            await setBotSettings(botId, { name_bot: text });
            await conn.updateProfileName(text);
            await m.react("✅");
            //return m.reply(`✅ Nombre del bot actualizado a: *${text}*`)
        }
        catch (e) {
            console.error("Error al cambiar nombre del bot:", e);
            await m.react("❌");
            return m.reply("❌ No se pudo cambiar el nombre del bot.");
        }
    },
};
