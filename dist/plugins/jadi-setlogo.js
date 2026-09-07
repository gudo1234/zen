import { setBotSettings } from "../lib/db.js";
export default {
    name: ["setlogo", "setppbot"],
    help: ["setlogo <url>", "setppbot (responde a imagen)"],
    desc: "Cambia el logo del bot o la foto de perfil.",
    tags: ["jadibot"],
    owner: true,
    run: async ({ conn, m, body, text, prefijo, cmd }) => {
        const botId = conn.user?.id?.split(":")[0];
        try {
            if (cmd === "setlogo") {
                if (!text || !text.startsWith("http"))
                    return m.reply(`${m.e.warn} URL inválida.\nUsa: ${prefijo + cmd} <url>\nEjemplo: ${prefijo + cmd} https://telegra.ph/file/39fb047cdf23c790e0146.jpg`);
                await setBotSettings(botId, { logo_url: text });
                await m.react("✅");
                return m.reply(`✅ Logo del bot actualizado a:\n${text}`);
            }
            if (cmd === "setppbot") {
                const q = m.quoted ? m.quoted : m;
                const mime = (q.msg || q).mimetype || q.mediaType || "";
                if (!/image/.test(mime))
                    return m.reply("⚠️ Responde o envía una imagen con el comando para cambiar el perfil del bot.");
                const img = await q.download();
                await conn.updateProfilePicture(conn.user.id || conn.user.lid, img);
                await m.react("✅");
            }
        }
        catch (e) {
            console.error("Error en setlogo/setppbot:", e);
            await m.react("❌");
        }
    },
};
