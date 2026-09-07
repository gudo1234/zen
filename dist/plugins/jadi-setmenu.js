import { setBotSettings, getBotSettings } from "../lib/db.js";
import fetch from "node-fetch";
import FormData from "form-data";
export default {
    name: ["setmenu"],
    help: ["setmenu --img <url>", "setmenu --vid <url>", "setmenu <texto>", "setmenu reset"],
    desc: "Personaliza el menú del bot (imagen, video o texto).",
    tags: ["jadibot"],
    owner: true,
    run: async ({ conn, m, args, text, prefijo, cmd }) => {
        const botId = conn.user?.id?.split(":")[0] || "mainbot";
        // Si no hay argumentos, mostrar ayuda
        if (!text && !m.quoted) {
            return m.reply(`🎨 *PERSONALIZAR MENÚ*\n\n` +
                `✏️ *Comandos:*\n` +
                `• ${prefijo + cmd} --img <url> - Cambiar imagen del menú\n` +
                `• ${prefijo + cmd} --vid <url> - Cambiar video del menú\n` +
                `• ${prefijo + cmd} (responde a imagen/video) - Sube automáticamente a EvoGB\n` +
                `• ${prefijo + cmd} <texto personalizado> - Personalizar texto del menú\n` +
                `• ${prefijo + cmd} reset - Restaurar menú por defecto\n` +
                `• ${prefijo + cmd} off - Desactivar personalización\n\n` +
                `📝 *VARIABLES DISPONIBLES:*\n` +
                `┌────────────────\n` +
                `│ 👤 *%name* - Nombre del usuario\n` +
                `│ 🏷️ *%tag* - Tag del usuario (@123456789)\n` +
                `│ 📅 *%fecha* - Fecha actual (DD/MM/YYYY)\n` +
                `│ 🕐 *%hora* - Hora actual (HH:mm:ss)\n` +
                `│ 🤖 *%wm* - Nombre del bot\n` +
                `│ ⏱️ *%muptime* - Tiempo activo del bot\n` +
                `│ 📊 *%limit* - Límite de comandos del usuario\n` +
                `│ 📢 *%botOfc* - Info si es bot oficial o sub bot\n` +
                `│ 👥 *%toUserReg* - Usuarios registrados\n` +
                `│ 👥 *%toUsers* - Total de usuarios en BD\n` +
                `│ 📍 *%plugin* - Comandos totales` +
                `│ #️⃣ *%prefix* - Prefijo del bot (/, *, !, etc)\n` +
                `│ 📂 *%group* - Nombre del grupo (solo en grupos)\n` +
                `└────────────────\n\n` +
                `📂 *CATEGORÍAS PERSONALIZADAS:*\n` +
                `┌────────────────\n` +
                `│ %main       - Comandos de INFOBOT\n` +
                `│ %jadibot   - Comandos de SER SUB BOT\n` +
                `│ %grupo     - Comandos de GRUPOS\n` +
                `│ %gacha     - Comandos de RPG GACHA\n` +
                `│ %rg        - Comandos de REGISTRO\n` +
                `│ %econ      - Comandos de RPG\n` +
                `│ %game      - Comandos de juegos\n` +
                `│ %downloader- Comandos de DESCARGAS\n` +
                `│ %buscadores- Comandos de BUSCADORES\n` +
                `│ %convertidor- Comandos de CONVERTIDORES\n` +
                `│ %tools     - Comandos de HERRAMIENTA\n` +
                `│ %nable     - Comandos de ENABLE/DISABLE\n` +
                `│ %sticker   - Comandos de STICKER\n` +
                `│ %randow   - Comandos RANDOW\n` +
                `│ %nsfw   - Comandos de NSFW\n` +
                `│ %ventas   - Comandos de VENTAS\n` +
                `│ %freefire   - Comandos de FREE FIRE\n` +
                `│ %owner     - Comandos de OWNER\n` +
                `└────────────────\n\n` +
                `📌 *Ejemplos:*\n` +
                `${prefijo + cmd} --img https://telegra.ph/file/39fb047cdf23c790e0146.jpg\n` +
                `${prefijo + cmd} Hola %name 👋\n\nEste es mi menú:\n\n╭━━━━━━━━━•\n| ○ %cmd -- %desc\n╰━━━━━━━━━•\n\n> by: %wm\n\n`);
        }
        await m.react("⌛");
        try {
            const arg = args[0]?.toLowerCase() || "";
            // Caso: Reset - restaurar menú por defecto
            if (arg === "reset") {
                await setBotSettings(botId, {
                    menu_type: "image",
                    menu_media: "",
                    menu_text: ""
                });
                await m.react("✅");
                return m.reply(`✅ *Menú restaurado a la configuración por defecto.*\n\n` +
                    `El menú volverá a usar la imagen y texto predeterminados.`);
            }
            // Caso: Desactivar
            if (arg === "off") {
                await setBotSettings(botId, {
                    menu_type: "image",
                    menu_media: "",
                    menu_text: ""
                });
                await m.react("✅");
                return m.reply(`✅ Menú personalizado desactivado.`);
            }
            // Caso: --img
            if (arg === "--img" || arg === "--image") {
                const url = args[1];
                if (!url || !url.startsWith("http")) {
                    return m.reply(`❌ URL inválida.\nUsa: ${prefijo + cmd} --img <url>`);
                }
                const currentSettings = await getBotSettings(botId);
                await setBotSettings(botId, {
                    menu_type: "image",
                    menu_media: url,
                    menu_text: currentSettings.menu_text || "" // PRESERVAR texto
                });
                await m.react("✅");
                return m.reply(`✅ Menú actualizado a imagen.\n\n🔗 ${url}`);
            }
            // Caso: --vid
            if (arg === "--vid" || arg === "--video") {
                const url = args[1];
                if (!url || !url.startsWith("http")) {
                    return m.reply(`❌ URL inválida.\nUsa: ${prefijo + cmd} --vid <url>`);
                }
                const currentSettings = await getBotSettings(botId);
                await setBotSettings(botId, {
                    menu_type: "video",
                    menu_media: url,
                    menu_text: currentSettings.menu_text || "" // PRESERVAR texto
                });
                await m.react("✅");
                return m.reply(`✅ Menú actualizado a video.\n\n🔗 ${url}`);
            }
            // Caso: Respondiendo a imagen/video
            if (m.quoted && (m.quoted.mimetype?.includes("image") || m.quoted.mimetype?.includes("video"))) {
                const media = await m.quoted.download();
                if (!media)
                    return m.reply("❌ No pude descargar el archivo.");
                const form = new FormData();
                form.append("file", media, {
                    filename: `menu_${Date.now()}`,
                    contentType: "application/octet-stream"
                });
                form.append("urlMode", "custom_name");
                form.append("author", "Mitzuki");
                const res = await fetch("https://evogb.win/api/upload", {
                    method: "POST",
                    body: form,
                    headers: form.getHeaders()
                });
                const json = await res.json().catch(() => ({}));
                if (!json?.success || !json?.url) {
                    return m.reply("❌ Error subiendo a EvoGB");
                }
                const isImage = m.quoted.mimetype.includes("image");
                const currentSettings = await getBotSettings(botId);
                await setBotSettings(botId, {
                    menu_type: isImage ? "image" : "video",
                    menu_media: json.url,
                    menu_text: currentSettings.menu_text || ""
                });
                await m.react("✅");
                return m.reply(`✅ Menú actualizado a ${isImage ? "imagen" : "video"}.\n\n🔗 ${json.url}`);
            }
            // Caso: Texto personalizado (cualquier cosa que no empiece con --)
            if (text && !text.startsWith("--")) {
                const currentSettings = await getBotSettings(botId);
                await setBotSettings(botId, {
                    menu_type: currentSettings.menu_type || "text", // PRESERVAR tipo
                    menu_media: currentSettings.menu_media || "", // PRESERVAR imagen/video
                    menu_text: text
                });
                await m.react("✅");
                return m.reply(`✅ Texto del menú actualizado.`);
            }
            // Si llegamos aquí, comando no reconocido
            return m.reply(`❌ Opción inválida.\n\n` +
                `📌 *Opciones:*\n` +
                `• ${prefijo + cmd} --img <url>\n` +
                `• ${prefijo + cmd} --vid <url>\n` +
                `• ${prefijo + cmd} <texto>\n` +
                `• ${prefijo + cmd} reset\n` +
                `• ${prefijo + cmd} off\n` +
                `• Responde a imagen/video con ${prefijo + cmd}`);
        }
        catch (e) {
            console.error("❌ Error en setmenu:", e);
            await m.react("❌");
            await m.reply(`${m.e.error} ${m.msg.error}\n\n >>> ${e.message || e} <<<`);
        }
    }
};
