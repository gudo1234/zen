import { getBotSettings, setBotSettings } from "../lib/db.js";
export default {
    name: ["setmoneyname", "setcurrency"],
    help: ["setmoneyname <nombre> <emoji>"],
    tags: ["jadibot"],
    desc: "Configura el nombre y emoji de la moneda del bot",
    owner: true,
    run: async ({ conn, m, args, prefijo, cmd }) => {
        if (args.length < 2)
            return m.reply(`✳️ Uso:\n${prefijo + cmd} <nombre> <emoji>\nEj: ${prefijo + cmd} Diamantes 💎`);
        const name = args.slice(0, -1).join(" ");
        const emoji = args[args.length - 1];
        const botId = conn.user?.id?.split(":")[0];
        const settings = await getBotSettings(botId);
        const emojiSet = {
            ...(settings.emoji_set || {}),
            currency_name: name,
            currency_emoji: emoji
        };
        await setBotSettings(botId, { emoji_set: emojiSet });
        return m.reply(`✅ Moneda del bot configurada:\n\n` +
            `${emoji} *${name}*`);
    }
};
