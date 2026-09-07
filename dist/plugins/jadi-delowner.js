import { getBotSettings, setBotSettings } from "../lib/db.js";
function cleanNumber(jid) {
    return (jid || "")
        .split("@")[0]
        .replace(/:\d+$/, "")
        .replace(/[^0-9]/g, "");
}
export default {
    name: "delowner",
    help: ["delowner"],
    desc: "Eliminar owner del bot",
    tags: ["jadibot"],
    owner: true,
    run: async ({ conn, m, body, prefijo, cmd }) => {
        const botId = conn.user?.id?.split(":")[0];
        const args = body.split(/\s+/).slice(1);
        let numbersToDel = [];
        const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        for (const jid of mentioned) {
            const num = cleanNumber(jid);
            if (num && num.length >= 10)
                numbersToDel.push(num);
        }
        for (const arg of args) {
            let num = arg.replace(/^\+/, '').replace(/[^0-9]/g, '');
            if (num.length >= 10)
                numbersToDel.push(num);
        }
        numbersToDel = [...new Set(numbersToDel)]; // unique
        if (!numbersToDel.length)
            return m.reply(`${m.e.warn} Usa: ${prefijo + cmd} +numero o @tag`);
        const config = await getBotSettings(botId);
        let owners = config.owners || [];
        const removed = [];
        owners = owners.filter(o => {
            if (numbersToDel.includes(o)) {
                removed.push(o);
                return false;
            }
            return true;
        });
        if (!removed.length)
            return m.reply(m.e.warn + " No son owners.");
        await setBotSettings(botId, { owners });
        return m.reply(`✅ Owners eliminados: ${removed.join(", ")}`);
    }
};
