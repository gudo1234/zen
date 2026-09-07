import { getBotSettings, setBotSettings } from "../lib/db.js";
export default {
    name: "setmsg",
    help: ["setmsg <tipo> <texto>"],
    desc: "Personaliza mensajes base del bot (error, warn, success, etc)",
    tags: ["jadibot"],
    run: async ({ conn, m, args, prefijo, cmd }) => {
        const [tipo, ...rest] = args;
        const texto = rest.join(" ");
        const validos = [
            "error",
            "warn",
            "success",
            "example",
            "limit",
            "admin",
            "group",
            "private",
            "owner",
        ];
        if (!tipo || !texto)
            return m.reply(`⚙️ *Uso correcto:* ${prefijo + cmd} <tipo> <mensaje>
    
💬 *Tipos disponibles:*
• error → mensaje cuando algo falla
• warn → advertencias o mensajes de precaución
• success → confirmación de acción exitosa
• example → ejemplo de uso de comando
• limit → mensaje cuando el usuario supera su límite
• admin → solo admins pueden usar
• group → comando solo para grupos
• private → comando solo para chat privado
• owner → comando solo para el dueño\n
📌 *Ejemplos de uso:*
${prefijo + cmd} error Ocurrió un fallo inesperado 💀
${prefijo + cmd} success Todo salió bien 😎
${prefijo + cmd} admin Solo los *admins* del grupo pueden usar esto
${prefijo + cmd} private Este comando solo se usa por privado 💬`);
        if (!validos.includes(tipo))
            return m.reply(`⚠️ Tipo inválido. Usa solo uno de estos:\n${validos.join(", ")}`);
        const botId = conn.user?.id?.split(":")[0].replace(/[^0-9]/g, "") || "mainbot";
        const settings = await getBotSettings(botId);
        const msgs = settings.system_msgs || {};
        msgs[tipo] = texto;
        await setBotSettings(botId, { system_msgs: msgs });
        m.reply(`✅ Mensaje de tipo *${tipo.toUpperCase()}* actualizado correctamente.\n\n📝 Nuevo texto:\n${texto}`);
    },
};
