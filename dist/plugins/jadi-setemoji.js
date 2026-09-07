import { getBotSettings, setBotSettings } from "../lib/db.js";
export default {
    name: "setemoji",
    help: ["setemoji tipo emoji"],
    desc: "Cambia los emojis del bot.",
    tags: ["jadibot"],
    run: async ({ conn, m, args, prefijo, cmd }) => {
        const [tipo, emoji] = args;
        if (!tipo || !emoji)
            return m.reply(`${m.e.warn} Usa: ${prefijo + cmd} <tipo> <emoji>\n\nTipos disponibles: error, ok, load, warn\n\nEjemplo:\n${prefijo + cmd} error 😵`);
        const botId = conn.user?.id?.split(":")[0].replace(/[^0-9]/g, "") || "mainbot";
        const current = await getBotSettings(botId);
        const emojiSet = current.emoji_set || {};
        if (!["error", "ok", "warn", "load"].includes(tipo))
            return m.reply(m.e.warn + " Tipo inválido. Usa: error, ok, warn, load");
        emojiSet[tipo] = emoji;
        await setBotSettings(botId, { emoji_set: emojiSet });
        m.reply(`✅ Emoji actualizado correctamente.\n\n${tipo.toUpperCase()}: ${emoji}`);
    },
};
