import { spawn } from "child_process";
import process from "process";
export default {
    name: ["reiniciar", "restart"],
    help: ["reiniciar"],
    desc: "Reinicia el bot completamente.",
    tags: ["owner"],
    owner: true,
    run: async ({ conn, m }) => {
        try {
            await m.react("🌀");
            const fases = ["10%", "30%", "55%", "80%", "100%"];
            const { key } = await conn.sendMessage(m.chat, { text: "*♻️ Reiniciando el bot...*" }, { quoted: m });
            for (const f of fases) {
                await new Promise((r) => setTimeout(r, 800));
                await conn.sendMessage(m.chat, { text: `*Progreso:* ${f}`, edit: key }, { quoted: m });
            }
            await conn.sendMessage(m.chat, { text: "🚀 *Reinicio completado, espere unos segundos...*", edit: key }, { quoted: m });
            await new Promise((r) => setTimeout(r, 1000));
            console.log("♻️ Reiniciando proceso principal...");
            if (process.env.pm_id !== undefined) {
                spawn("pm2", ["restart", process.env.pm_id], { stdio: "inherit" });
            }
            else {
                spawn("node", ["dist/index.js"], {
                    stdio: "inherit",
                    detached: true,
                });
            }
            process.exit(0);
        }
        catch (err) {
            console.error("❌ Error en /reiniciar:", err);
            await m.reply("⚠️ Error al intentar reiniciar el bot.");
            await m.react("❌");
        }
    },
};
