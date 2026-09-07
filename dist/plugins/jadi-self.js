import { setBotSettings } from "../lib/db.js";
export default {
    name: "self",
    help: ["self on/off"],
    desc: "Poner el bot en modo self (solo owners) o publico",
    tags: ["jadibot"],
    owner: true,
    run: async ({ conn, m, body, prefijo, cmd }) => {
        const botId = conn.user?.id?.split(":")[0] || "default";
        const args = body.trim().split(/\s+/)[1]?.toLowerCase() || "";
        if (!["on", "off"].includes(args))
            return m.reply(`${m.e.warn} Usa: ${prefijo + cmd} on | ${prefijo + cmd} off`);
        const newMode = args === "on" ? "self" : "public";
        await setBotSettings(botId, { mode: newMode });
        const estado = newMode === "self" ? "🔒 *Privado*" : "🌐 *Público*";
        return m.reply(`✅ Modo cambiado a: ${estado}`);
    }
};
