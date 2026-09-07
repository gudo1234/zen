import { setBotSettings } from "../lib/db.js";
export default {
    name: "setreg",
    help: ["setreg on/off"],
    desc: "Activa o desactiva el registro obligatorio para usar el bot",
    tags: ["jadibot"],
    owner: true,
    run: async ({ conn, m, args, prefijo, cmd }) => {
        const estado = (args[0] || "").toLowerCase();
        if (!["on", "off", "true", "false"].includes(estado)) {
            return m.reply(`${m.e.warn} Usa:\n` +
                `${prefijo + cmd} on — Activar registro obligatorio\n` +
                `${prefijo + cmd} off — Desactivar registro obligatorio`);
        }
        const activar = ["on", "true"].includes(estado);
        const botId = conn.user?.id?.split(":")[0].replace(/[^0-9]/g, "") || "mainbot";
        await setBotSettings(botId, { registro: activar });
        const texto = activar
            ? "✅ *Registro activado*\n> Los usuarios deben registrarse para usar el bot."
            : "✅ *Registro desactivado*\n> Los usuarios pueden usar el bot sin registrarse.";
        return m.reply(texto);
    }
};
