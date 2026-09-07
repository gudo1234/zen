import { setBotSettings } from "../lib/db.js";
export default {
    name: ["setprivacy", "setprestar", "privacy", "prestar", "autojoin"],
    help: ["setprivacy on/off", "autojoin on/off"],
    desc: "Activa o desactiva privacidad y prestar del bot",
    tags: ["jadibot"],
    owner: true,
    register: true,
    run: async ({ conn, m, args, prefijo, cmd }) => {
        const estado = (args[0] || "").toLowerCase();
        if (!["on", "off", "true", "false"].includes(estado)) {
            return m.reply(`${m.e.warn} Usa:\n` +
                `${prefijo}${cmd} on — Activar\n` +
                `${prefijo}${cmd} off — Desactivar`);
        }
        const activar = ["on", "true"].includes(estado);
        const botId = conn.user?.id?.split(":")[0].replace(/[^0-9]/g, "") || "mainbot";
        if (/setprivacy|privacy/i.test(cmd)) {
            await setBotSettings(botId, { privacy: activar });
            const texto = activar
                ? "✅ *Privacidad activada 🔒*\n> Tu número no se mostrará en la lista de bots."
                : "✅ *Privacidad desactivada 🔓*\n> Tu número será visible en la lista de bots.";
            return m.reply(texto);
        }
        if (/setprestar|prestar|autojoin/i.test(cmd)) {
            await setBotSettings(botId, { prestar: activar });
            const texto = activar
                ? "✅ *Prestar activado*\n> Los usuarios pueden unir el bot directamente con .join"
                : "✅ *Prestar desactivado*\n> Los usuarios deben esperar aprobación del owner";
            return m.reply(texto);
        }
    }
};
