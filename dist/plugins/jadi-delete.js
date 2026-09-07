import fs from "fs";
import path from "path";
import chalk from "chalk";
import { subbotUptimes } from "../plugins/jadibot.js";
function clearSubbotSession(numero) {
    const dir = path.resolve(`./sessions/sub_${numero}`);
    try {
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
            console.log(chalk.red(`🗑️ Sesión subbot ${numero} eliminada`));
        }
    }
    catch (e) {
        console.error(`❌ Error borrando sesión subbot ${numero}:`, e);
    }
}
export default {
    name: "deletesession",
    help: ["deletesession"],
    desc: "eliminar rostros de sub bot",
    tags: ["jadibot"],
    private: true,
    owner: true,
    run: async ({ conn, m }) => {
        // ❌ no permitir en bot principal
        if (conn.isMainBot) {
            return conn.sendMessage(m.chat, { text: "⚠️ Este comando solo funciona en subbots." }, { quoted: m });
        }
        const numero = conn.user?.id?.split(":")[0];
        if (!numero)
            return;
        // 🧹 borrar carpeta ./sessions/sub_<numero>
        clearSubbotSession(numero);
        // 🧠 borrar uptime
        if (subbotUptimes[numero]) {
            delete subbotUptimes[numero];
        }
        // 📩 aviso
        await conn.sendMessage(m.chat, {
            text: "🗑️ *Subbot eliminado completamente*\n\n" +
                "✔ Sesión borrada\n" +
                "✔ Credenciales eliminadas\n" +
                "✔ Carpeta eliminada\n\n" +
                "Para volver a usar este número ejecuta */code* desde el bot principal."
        }, { quoted: m });
        // 🔌 cerrar conexión
        try {
            await conn.logout();
            conn.ws?.close();
        }
        catch { }
    }
};
