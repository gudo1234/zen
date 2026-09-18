import { db } from "../lib/db.js";
import fetch from "node-fetch";
const userRequests = {};
const LIMITS = {
    premium: 2 * 1024 * 1024 * 1024, // 2 GB para owners y premium
    free: 150 * 1024 * 1024, // 150 MB para usuarios normales
};
/* ================= HELPERS ================= */
const fetchWithTimeout = async (url, timeoutMs = 600000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const r = await fetch(url, { signal: controller.signal });
        return r;
    }
    finally {
        clearTimeout(timer);
    }
};
function formatBytes(bytes) {
    if (!bytes || isNaN(bytes) || bytes <= 0)
        return null;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
}
function sanitizeFileName(name) {
    return String(name).replace(/[\\/:*?"<>|]/g, "").trim().slice(0, 150);
}
async function isPremiumUser(db, senderJid, senderLid, senderNumber) {
    try {
        const res = await db.query(`SELECT premium, premium_until FROM usuarios 
       WHERE id = $1 OR lid = $2 OR num = $3
       LIMIT 1`, [senderJid, senderLid, senderNumber]);
        if (!res.rowCount)
            return false;
        const user = res.rows[0];
        const until = Number(user?.premium_until) || 0;
        return !!user?.premium && until > Date.now();
    }
    catch (e) {
        return false;
    }
}
export default {
    name: ["drive"],
    help: ["drive"],
    desc: "Descarga archivos y carpetas de Google Drive",
    tags: ["downloader"],
    limitPrem: true,
    limit: 4,
    run: async ({ conn, m, text, prefijo, cmd, isOwner }) => {
        if (!text) {
            return m.reply(`🤔 ¿Qué quieres descargar de Google Drive?\n\n` +
                `${m.e.warn} *Usa:*\n${prefijo + cmd} <link de Drive>\n\n` +
                `*Ejemplos:*\n` +
                `• ${prefijo + cmd} https://drive.google.com/file/d/ABC123/view\n` +
                `• ${prefijo + cmd} https://drive.google.com/drive/folders/XYZ789`);
        }
        if (userRequests[m.sender]) {
            return m.reply(`⏳ Hey @${m.sender.split("@")[0]} espera, ya tienes una descarga en proceso...`);
        }
        if (!/drive\.google\.com/i.test(text)) {
            return m.reply(`${m.e.warn} Eso no parece un link de Google Drive`);
        }
        const url = String(text).trim();
        userRequests[m.sender] = true;
        m.react("⏳");
        try {
            console.log(`[drive] Procesando: ${url}`);
            const apiKey = process.env.API_KEY;
            if (!apiKey) {
                return m.reply(`${m.e.warn} API_KEY no configurada`);
            }
            const senderJid = m.sender || "";
            const senderLid = m.lid || null;
            const senderNumber = (m.sender || "").replace(/[^0-9]/g, "");
            const premiumActive = await isPremiumUser(db, senderJid, senderLid, senderNumber);
            const hasUnlimited = isOwner || premiumActive;
            const maxSize = hasUnlimited ? LIMITS.premium : LIMITS.free;
            const maxSizeFormatted = formatBytes(maxSize);
            console.log(`[drive] sender=${senderNumber} premium=${premiumActive} owner=${isOwner} maxSize=${maxSizeFormatted}`);
            const apiUrl = `https://api.mitzuki.xyz/download/drive?url=${encodeURIComponent(url)}&apikey=${apiKey}`;
            const res = await fetchWithTimeout(apiUrl, 120000);
            const json = (await res.json());
            if (!json.status || !json.data) {
                return m.reply(`${m.e.warn} ${json.error || "No se pudo procesar el link"}`);
            }
            /* ============ CASO 1: ARCHIVO ÚNICO ============ */
            if (json.data.type === "file") {
                const data = json.data;
                const filename = sanitizeFileName(data.filename || "drive_file");
                const sizeFormatted = data.size_formatted || formatBytes(data.size) || "Desconocido";
                // Verificar límite según usuario
                if (data.size && data.size > maxSize) {
                    const tipo = hasUnlimited ? "premium" : "gratuito";
                    return m.reply(`⚠️ *${filename}*\n\n` +
                        `📦 Tamaño: *${sizeFormatted}*\n` +
                        `❌ Supera el límite ${tipo} (${maxSizeFormatted})\n\n` +
                        (hasUnlimited ? '' : `💎 *Pásate a Premium* para descargar hasta 2 GB\n\n`) +
                        `🔗 *Descarga directa:*\n${data.dl_download}\n\n` +
                        `_Cópialo y ábrelo en tu navegador._`);
                }
                if (!data.dl_download) {
                    return m.reply(`${m.e.warn} No se pudo obtener el link de descarga`);
                }
                // Preview
                try {
                    await conn.reply(m.chat, `📁 *${filename}*\n\n📦 ${sizeFormatted}\n\n> ⏳ Enviando...`, m);
                }
                catch { }
                // Enviar como DOCUMENTO (sin límites)
                await sendAsDocument(conn, m, data.dl_download, filename);
                m.react("✅️");
                m.success = true;
                return;
            }
            /* ============ CASO 2: CARPETA ============ */
            if (json.data.type === "folder") {
                const data = json.data;
                const files = data.files || [];
                const totalFiles = data.total_files || files.length;
                if (!files.length) {
                    return m.reply(`${m.e.warn} La carpeta está vacía`);
                }
                // Filtrar archivos que superan el límite del usuario
                const validFiles = files.filter(f => !f.size || f.size <= maxSize);
                const bigFiles = files.filter(f => f.size && f.size > maxSize);
                if (!validFiles.length) {
                    let msg = `📁 *${data.folder_name || "Carpeta"}*\n\n`;
                    msg += `⚠️ Todos los archivos superan el límite (${maxSizeFormatted}).\n\n`;
                    if (!hasUnlimited) {
                        msg += `💎 *Pásate a Premium* para descargar hasta 2 GB.\n\n`;
                    }
                    msg += `*Links directos:*\n\n`;
                    bigFiles.slice(0, 10).forEach((f, i) => {
                        msg += `${i + 1}. *${f.filename}* (${f.size_formatted})\n${f.dl_download}\n\n`;
                    });
                    return m.reply(msg);
                }
                // Límite de archivos a enviar
                const MAX_FILES_TO_SEND = hasUnlimited ? 20 : 5;
                const filesToSend = validFiles.slice(0, MAX_FILES_TO_SEND);
                // Preview
                let listText = `📁 *${data.folder_name || "Carpeta"}*\n\n`;
                listText += `• Total: ${totalFiles} archivos\n`;
                listText += `• Enviando: ${filesToSend.length}\n`;
                if (bigFiles.length > 0) {
                    listText += `• Omitidos (>{maxSizeFormatted}): ${bigFiles.length}\n`;
                }
                listText += `\n`;
                filesToSend.forEach((f, i) => {
                    const size = f.size_formatted || formatBytes(f.size) || "?";
                    listText += `${i + 1}. 📄 ${f.filename} (${size})\n`;
                });
                if (validFiles.length > MAX_FILES_TO_SEND) {
                    listText += `\n_...y ${validFiles.length - MAX_FILES_TO_SEND} más_`;
                }
                try {
                    await conn.reply(m.chat, listText, m);
                }
                catch { }
                // Enviar cada archivo como documento
                let sent = 0;
                let failed = 0;
                for (let i = 0; i < filesToSend.length; i++) {
                    const file = filesToSend[i];
                    const fname = sanitizeFileName(file.filename || `file_${i + 1}`);
                    try {
                        console.log(`[drive] Enviando ${i + 1}/${filesToSend.length}: ${fname}`);
                        await sendAsDocument(conn, m, file.dl_download, fname);
                        sent++;
                        await new Promise(r => setTimeout(r, 2000));
                    }
                    catch (e) {
                        console.error(`[drive] Error:`, e.message);
                        failed++;
                    }
                }
                let summary = `✅ *Envío completado*\n\n`;
                summary += `• Enviados: ${sent}\n`;
                if (failed > 0)
                    summary += `• Fallidos: ${failed}\n`;
                if (bigFiles.length > 0)
                    summary += `• Omitidos: ${bigFiles.length}\n`;
                if (!hasUnlimited && bigFiles.length > 0) {
                    summary += `\n💎 _Pásate a Premium para más._`;
                }
                await conn.sendMessage(m.chat, { text: summary }, { quoted: m });
                m.react("✅️");
                m.success = true;
                return;
            }
            return m.reply(`${m.e.warn} Tipo desconocido`);
        }
        catch (err) {
            console.error("[drive] Error:", err);
            await m.react("❌");
            return m.reply(`${m.e.warn} Error: ${err.message || "desconocido"}`);
        }
        finally {
            delete userRequests[m.sender];
        }
    }
};
/* ============ ENVÍO COMO DOCUMENTO (sin límites) ============ */
async function sendAsDocument(conn, m, url, filename) {
    const ext = (filename.match(/\.[a-zA-Z0-9]{1,6}$/)?.[0] || "").toLowerCase();
    return conn.sendMessage(m.chat, {
        document: { url },
        mimetype: mimeFromExt(ext),
        fileName: filename,
    }, { quoted: m });
}
function mimeFromExt(ext) {
    const map = {
        ".zip": "application/zip",
        ".rar": "application/vnd.rar",
        ".7z": "application/x-7z-compressed",
        ".pdf": "application/pdf",
        ".apk": "application/vnd.android.package-archive",
        ".iso": "application/x-iso9660-image",
        ".exe": "application/x-msdownload",
        ".msi": "application/x-msi",
        ".deb": "application/vnd.debian.binary-package",
        ".rpm": "application/x-rpm",
        ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xls": "application/vnd.ms-excel",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".ppt": "application/vnd.ms-powerpoint",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".txt": "text/plain",
        ".csv": "text/csv",
        ".json": "application/json",
        ".mp3": "audio/mpeg",
        ".mp4": "video/mp4",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp"
    };
    return map[ext] || "application/octet-stream";
}
