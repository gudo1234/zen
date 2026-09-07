import { db } from "../lib/db.js";
import fetch from "node-fetch";
import FormData from "form-data";
const VENTAS_COMMANDS = [
    "disney", "combo",
    "combo2", "diamantes", "gamepass", "hbo", "metodos", "numerovirtual", "netflix",
    "prime", "pasesff", "pagos", "peliculas", "promo", "recargas", "reglas", "robux",
    "servicios", "stock", "youtube", "redes"
];
const COMMAND_NAMES = [...VENTAS_COMMANDS, ...VENTAS_COMMANDS.map(c => `set${c}`), "setventa"];
async function getSale(groupId, command) {
    // Primero buscar en el grupo
    let res = await db.query("SELECT * FROM ventas WHERE group_id = $1 AND command = $2", [groupId, command.toLowerCase()]);
    if (res.rows.length > 0)
        return res.rows[0];
    // Si no hay, buscar global - CORREGIDO
    res = await db.query("SELECT * FROM ventas WHERE group_id IS NULL AND command = $1 AND global = true", [command.toLowerCase()]);
    return res.rows[0] || null;
}
async function setSale(groupId, command, type, content, createdBy, global = false, contentText = "") {
    const group = global ? null : groupId;
    await db.query(`INSERT INTO ventas (group_id, command, type, content, content_text, created_by, global, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (group_id, command) DO UPDATE SET
       type = EXCLUDED.type,
       content = EXCLUDED.content,
       content_text = EXCLUDED.content_text,
       created_by = EXCLUDED.created_by,
       global = EXCLUDED.global,
       updated_at = NOW()`, [group, command.toLowerCase(), type, content, contentText, createdBy, global]);
}
async function deleteSale(groupId, command, global = false) {
    if (global) {
        await db.query("DELETE FROM ventas WHERE group_id IS NULL AND command = $1 AND global = true", [command.toLowerCase()]);
    }
    else {
        await db.query("DELETE FROM ventas WHERE group_id = $1 AND command = $2", [groupId, command.toLowerCase()]);
    }
}
async function listSales(groupId) {
    const res = await db.query("SELECT command, type, content_text FROM ventas WHERE group_id = $1 ORDER BY command", [groupId]);
    return res.rows;
}
async function listGlobalSales() {
    const res = await db.query("SELECT command, type, content_text FROM ventas WHERE group_id IS NULL AND global = true ORDER BY command");
    return res.rows;
}
export default {
    name: COMMAND_NAMES,
    help: VENTAS_COMMANDS,
    tags: ["ventas"],
    desc: "Comandos de ventas configurados por grupo",
    group: true,
    run: async ({ conn, m, args, text, prefijo, cmd, isAdmin, isOwner, isROwner }) => {
        const groupId = m.chat;
        const command = cmd.toLowerCase();
        const esOwner = isOwner || isROwner;
        // ============================
        // setventa
        // ============================
        if (command === "setventa") {
            if (!isAdmin && !esOwner) {
                return m.reply(m.e.warn + ` ${m.msg.admin}`);
            }
            const subCmd = args[0]?.toLowerCase() || "";
            const isGlobal = args.includes("--global") || args.includes("-g");
            if (!subCmd || !text) {
                return m.reply(`📦 *GESTIÓN DE VENTAS*\n\n` +
                    `• ${prefijo}setventa <command> <text> - Configurar texto\n` +
                    `• ${prefijo}setventa <command> (responde a imagen/video) - Configurar media\n` +
                    `• ${prefijo}setventa <command> <text> (responde a imagen) - Configurar imagen con texto\n` +
                    `• ${prefijo}setventa list - Listar configurados\n` +
                    `• ${prefijo}setventa listglobal - Listar globales (solo owner)\n` +
                    `• ${prefijo}setventa del <command> - Eliminar\n` +
                    `• ${prefijo}setventa delglobal <command> - Eliminar global (solo owner)\n` +
                    `• ${prefijo}set<command> - Atajo (ej: ${prefijo}setcanva)`);
            }
            if (subCmd === "list") {
                const sales = await listSales(groupId);
                if (sales.length === 0) {
                    return m.reply(`📭 No hay comandos configurados en este grupo.`);
                }
                let lista = `📋 *COMANDOS CONFIGURADOS* (${sales.length})\n\n`;
                for (const v of sales) {
                    const icon = v.type === "text" ? "📝" : v.type === "image" ? "🖼️" : v.type === "video" ? "🎬" : "📦";
                    const hasText = v.content_text ? ` (con texto)` : "";
                    lista += `${icon} *.${v.command}*${hasText}\n`;
                }
                return m.reply(lista);
            }
            if (subCmd === "listglobal") {
                if (!esOwner)
                    return m.reply(m.e.warn + ` Solo el owner puede ver globales.`);
                const sales = await listGlobalSales();
                if (sales.length === 0) {
                    return m.reply(`📭 No hay comandos globales configurados.`);
                }
                let lista = `🌍 *COMANDOS GLOBALES* (${sales.length})\n\n`;
                for (const v of sales) {
                    const icon = v.type === "text" ? "📝" : v.type === "image" ? "🖼️" : v.type === "video" ? "🎬" : "📦";
                    const hasText = v.content_text ? ` (con texto)` : "";
                    lista += `${icon} *.${v.command}*${hasText} (global)\n`;
                }
                return m.reply(lista);
            }
            if (subCmd === "del") {
                const cmdDel = args[1]?.toLowerCase();
                if (!cmdDel)
                    return m.reply(`❌ Especifica el comando. Ej: ${prefijo}setventa del canva`);
                if (!VENTAS_COMMANDS.includes(cmdDel)) {
                    return m.reply(`❌ "${cmdDel}" no es un comando de ventas.`);
                }
                await deleteSale(groupId, cmdDel, false);
                return m.reply(`✅ *.${cmdDel}* eliminado del grupo.`);
            }
            if (subCmd === "delglobal") {
                if (!esOwner)
                    return m.reply(m.e.warn + ` Solo el owner puede eliminar globales.`);
                const cmdDel = args[1]?.toLowerCase();
                if (!cmdDel)
                    return m.reply(`❌ Especifica el comando. Ej: ${prefijo}setventa delglobal canva`);
                if (!VENTAS_COMMANDS.includes(cmdDel)) {
                    return m.reply(`❌ "${cmdDel}" no es un comando de ventas.`);
                }
                await deleteSale(groupId, cmdDel, true);
                return m.reply(`✅ *.${cmdDel}* eliminado globalmente.`);
            }
            if (!VENTAS_COMMANDS.includes(subCmd)) {
                return m.reply(`❌ "${subCmd}" no es un comando de ventas.`);
            }
            if (isGlobal && !esOwner) {
                return m.reply(m.e.warn + ` Solo el owner puede guardar comandos globales.`);
            }
            // OBTENER TEXTO
            const texto = args.slice(1).join(" ").trim();
            // ============================================
            // CASO 1: Respondiendo a imagen/video CON texto
            // ============================================
            if (m.quoted && m.quoted.message && (m.quoted.mimetype?.includes("image") || m.quoted.mimetype?.includes("video") || m.quoted.mimetype?.includes("audio") || m.quoted.mimetype?.includes("webp"))) {
                const media = await m.quoted.download();
                if (!media)
                    return m.reply("❌ No pude descargar el archivo.");
                const form = new FormData();
                form.append("file", media, {
                    filename: `${subCmd}_${Date.now()}`,
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
                let type = "image";
                if (m.quoted.mimetype?.includes("video"))
                    type = "video";
                else if (m.quoted.mimetype?.includes("audio"))
                    type = "audio";
                else if (m.quoted.mimetype?.includes("webp"))
                    type = "sticker";
                // Guardar imagen y TEXTO si existe
                await setSale(groupId, subCmd, type, json.url, m.sender, isGlobal, texto || "");
                await m.react("✅");
                return m.reply(`✅ *${subCmd.toUpperCase()}* configurado${isGlobal ? ' GLOBALMENTE' : ''}.\n\n` +
                    `📎 ${json.url}` +
                    (texto ? `\n📝 "${texto}"` : ''));
            }
            // ============================================
            // CASO 2: Solo texto (sin responder a nada)
            // ============================================
            if (texto) {
                await setSale(groupId, subCmd, "text", texto, m.sender, isGlobal, "");
                await m.react("✅");
                return m.reply(`✅ *${subCmd.toUpperCase()}* configurado${isGlobal ? ' GLOBALMENTE' : ''}.\n\n📝 "${texto}"`);
            }
            return m.reply(`❌ Escribe el texto o responde a una imagen/video.`);
        }
        // ============================
        // set<command> (ej: setcanva)
        // ============================
        if (command.startsWith("set") && VENTAS_COMMANDS.includes(command.replace("set", ""))) {
            if (!isAdmin && !esOwner) {
                return m.reply(m.e.warn + ` ${m.msg.admin}`);
            }
            const cmdReal = command.replace("set", "");
            const isGlobal = args.includes("--global") || args.includes("-g");
            if (isGlobal && !esOwner) {
                return m.reply(m.e.warn + ` Solo el owner puede guardar comandos globales.`);
            }
            const texto = text.trim();
            // ============================================
            // CASO 1: Respondiendo a imagen/video CON texto
            // ============================================
            if (m.quoted && m.quoted.message && (m.quoted.mimetype?.includes("image") || m.quoted.mimetype?.includes("video") || m.quoted.mimetype?.includes("audio") || m.quoted.mimetype?.includes("webp"))) {
                const media = await m.quoted.download();
                if (!media)
                    return m.reply("❌ No pude descargar el archivo.");
                const form = new FormData();
                form.append("file", media, {
                    filename: `${cmdReal}_${Date.now()}`,
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
                let type = "image";
                if (m.quoted.mimetype?.includes("video"))
                    type = "video";
                else if (m.quoted.mimetype?.includes("audio"))
                    type = "audio";
                else if (m.quoted.mimetype?.includes("webp"))
                    type = "sticker";
                // Guardar imagen y TEXTO si existe
                await setSale(groupId, cmdReal, type, json.url, m.sender, isGlobal, texto || "");
                await m.react("✅");
                return m.reply(`✅ *${cmdReal.toUpperCase()}* configurado${isGlobal ? ' GLOBALMENTE' : ''}.\n\n` +
                    `📎 ${json.url}` +
                    (texto ? `\n📝 "${texto}"` : ''));
            }
            // ============================================
            // CASO 2: Solo texto
            // ============================================
            if (texto) {
                await setSale(groupId, cmdReal, "text", texto, m.sender, isGlobal, "");
                await m.react("✅");
                return m.reply(`✅ *${cmdReal.toUpperCase()}* configurado${isGlobal ? ' GLOBALMENTE' : ''}.\n\n📝 "${texto}"`);
            }
            return m.reply(`❌ Escribe el texto o responde a una imagen/video.`);
        }
        // ============================
        // COMANDOS NORMALES (canva, disney, stock, etc)
        // ============================
        if (VENTAS_COMMANDS.includes(command)) {
            const sale = await getSale(groupId, command);
            if (!sale) {
                const nombre = command.charAt(0).toUpperCase() + command.slice(1);
                return m.reply(`🖼️ No hay *${nombre}* configurado en este chat.\n\n` +
                    `Un admin puede ponerlo con *.set${command}*`);
            }
            const { type, content, content_text, global } = sale;
            // Si es texto
            if (type === "text") {
                return m.reply(content);
            }
            // Si es imagen con texto
            if (type === "image") {
                const caption = content_text || `📸 *${command.toUpperCase()}*${global ? ' 🌍' : ''}`;
                return conn.sendMessage(groupId, {
                    image: { url: content },
                    caption: caption
                }, { quoted: m });
            }
            if (type === "video") {
                const caption = content_text || `🎬 *${command.toUpperCase()}*${global ? ' 🌍' : ''}`;
                return conn.sendMessage(groupId, {
                    video: { url: content },
                    caption: caption
                }, { quoted: m });
            }
            if (type === "audio") {
                return conn.sendMessage(groupId, {
                    audio: { url: content },
                    mimetype: "audio/mpeg",
                    ptt: true
                }, { quoted: m });
            }
            if (type === "sticker") {
                return conn.sendMessage(groupId, {
                    sticker: { url: content }
                }, { quoted: m });
            }
            return m.reply(content);
        }
    }
};
