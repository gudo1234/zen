import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
const userRequests = {};
const userCaptions = new Map();
/* ================= LÍMITES ================= */
const LIMITS = {
    premium: 2 * 1024 * 1024 * 1024, // 2 GB para owners y premium
    free: 150 * 1024 * 1024, // 150 MB para usuarios normales
};
const TMP_DIR = "/home/container/tmp";
// Chunks de 5 MB para subir sin cargar todo en RAM
const UPLOAD_CHUNK_SIZE = 5 * 1024 * 1024;
// Umbral para avisar del tiempo (1 GB)
const ONE_GB = 1024 * 1024 * 1024;
/* ================= HELPERS ================= */
function formatBytes(bytes) {
    if (!bytes || isNaN(bytes) || bytes <= 0)
        return null;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
}
function parseSizeToBytes(sizeStr) {
    if (!sizeStr)
        return null;
    if (typeof sizeStr === "number")
        return sizeStr;
    const s = String(sizeStr).trim().toUpperCase();
    const m = s.match(/^([\d.,]+)\s*(B|KB|MB|GB|TB|KIB|MIB|GIB)$/);
    if (!m)
        return null;
    const num = Number(m[1].replace(",", "."));
    if (!Number.isFinite(num))
        return null;
    const unit = m[2];
    const mult = {
        B: 1, KB: 1024, KIB: 1024,
        MB: 1024 ** 2, MIB: 1024 ** 2,
        GB: 1024 ** 3, GIB: 1024 ** 3,
        TB: 1024 ** 4
    };
    return Math.floor(num * (mult[unit] || 1));
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
    catch {
        return false;
    }
}
/* ================= MAIN ================= */
export default {
    name: ["mediafire", "mediafiredl", "dlmediafire"],
    help: ["mediafire <url>"],
    desc: "Descarga archivos desde enlaces de Mediafire.",
    tags: ["downloader"],
    register: true,
    limitPrem: true,
    limit: 3,
    run: async ({ conn, m, args, prefijo, cmd, isOwner }) => {
        const stickerError = "https://qu.ax/Wdsb.webp";
        if (!args[0]) {
            return m.reply(`${m.e.warn} *Ingresa un enlace válido de Mediafire.*\n\n` +
                `📌 Ejemplo:\n${prefijo + cmd} https://www.mediafire.com/file/sd9hl31vhhzf76v/EvolutionV1.1-beta.apk/file`);
        }
        if (userRequests[m.sender]) {
            await conn.reply(m.chat, `${m.e.warn} Hey @${m.sender.split("@")[0]}, ya estás descargando algo 🙄\nEspera a que termine.`, userCaptions.get(m.sender) || m);
            return;
        }
        userRequests[m.sender] = true;
        await m.react("⏳");
        let tmpFile = null;
        try {
            /* ============ DETECTAR PREMIUM ============ */
            const { db } = await import("../lib/db.js");
            const senderJid = m.sender || "";
            const senderLid = m.lid || null;
            const senderNumber = (m.sender || "").replace(/[^0-9]/g, "");
            const premiumActive = await isPremiumUser(db, senderJid, senderLid, senderNumber);
            const hasUnlimited = isOwner || premiumActive;
            const maxSize = hasUnlimited ? LIMITS.premium : LIMITS.free;
            const maxSizeFormatted = formatBytes(maxSize);
            console.log(`[mediafire] sender=${senderNumber} premium=${premiumActive} owner=${isOwner} maxSize=${maxSizeFormatted}`);
            /* ============ APIs DE FALLBACK ============ */
            const apis = [
                // 1) Mitzuki
                async () => {
                    const res = await fetch(`https://api.mitzuki.xyz/download/mediafire?url=${encodeURIComponent(args[0])}&apikey=${process.env.API_KEY}`);
                    const data = await res.json();
                    if (data?.data?.type === "file") {
                        return {
                            url: data.data.dl_download || data.data.download,
                            filename: data.data.name || data.data.filename,
                            filesize: data.data.size_formatted || formatBytes(data.data.size),
                            filesizeBytes: data.data.size,
                            mimetype: data.data.mime || "application/octet-stream",
                            power: "power by: api.mitzuki.xyz"
                        };
                    }
                    if (data?.data?.type === "folder" && data.data.files?.length) {
                        const f = data.data.files[0];
                        return {
                            url: f.dl_download || f.download,
                            filename: f.name || f.filename,
                            filesize: f.size_formatted || formatBytes(f.size),
                            filesizeBytes: f.size,
                            mimetype: f.mime || "application/octet-stream",
                            power: "power by: api.mitzuki.xyz"
                        };
                    }
                    if (data?.data?.files?.length) {
                        const f = data.data.files[0];
                        return {
                            url: f.download,
                            filename: f.name,
                            filesize: f.size,
                            filesizeBytes: parseSizeToBytes(f.size),
                            mimetype: f.mime || "application/octet-stream",
                            power: "power by: api.mitzuki.xyz"
                        };
                    }
                    throw new Error("Mitzuki sin datos");
                },
                // 2) Delirius
                async () => {
                    const res = await fetch(`https://api.delirius.store/download/mediafire?url=${args[0]}`);
                    const data = await res.json();
                    const f = data.data[0];
                    return {
                        url: f.link,
                        filename: f.filename,
                        filesize: f.size,
                        filesizeBytes: parseSizeToBytes(f.size),
                        mimetype: f.mime || "application/octet-stream",
                        power: "power by: api.delirius.store"
                    };
                },
                // 3) Neoxr
                async () => {
                    const res = await fetch(`https://api.neoxr.eu/api/mediafire?url=${args[0]}&apikey=russellxz`);
                    const data = await res.json();
                    if (!data.status || !data.data)
                        throw new Error("Error en Neoxr");
                    return {
                        url: data.data.url,
                        filename: data.data.title,
                        filesize: data.data.size,
                        filesizeBytes: parseSizeToBytes(data.data.size),
                        mimetype: data.data.mime || "application/octet-stream",
                        power: "power by: api.neoxr.eu"
                    };
                },
                // 4) Agatz
                async () => {
                    const res = await fetch(`https://api.agatz.xyz/api/mediafire?url=${args[0]}`);
                    const data = await res.json();
                    const f = data.data[0];
                    return {
                        url: f.link,
                        filename: f.nama,
                        filesize: f.size,
                        filesizeBytes: parseSizeToBytes(f.size),
                        mimetype: f.mime || "application/octet-stream",
                        power: "power by: api.agatz.xyz"
                    };
                },
                // 5) Siputzx
                async () => {
                    const res = await fetch(`https://api.siputzx.my.id/api/d/mediafire?url=${args[0]}`);
                    const data = await res.json();
                    const f = data.data[0];
                    return {
                        url: f.link,
                        filename: f.filename,
                        filesize: f.size,
                        filesizeBytes: parseSizeToBytes(f.size),
                        mimetype: f.mime || "application/octet-stream",
                        power: "power by: api.siputzx.my.id"
                    };
                }
            ];
            let file = null;
            for (const attempt of apis) {
                try {
                    file = await attempt();
                    if (file)
                        break;
                }
                catch (err) {
                    console.error(`⚠️ Error en intento: ${err.message}`);
                }
            }
            if (!file)
                throw new Error("❌ No se pudo obtener el archivo desde ninguna API.");
            /* ============ VERIFICAR LÍMITE ============ */
            const sizeBytes = file.filesizeBytes || parseSizeToBytes(file.filesize);
            if (sizeBytes && sizeBytes > maxSize) {
                const tipo = hasUnlimited ? "premium" : "gratuito";
                return m.reply(`⚠️ *${sanitizeFileName(file.filename)}*\n\n` +
                    `📦 Tamaño: *${file.filesize || formatBytes(sizeBytes)}*\n` +
                    `❌ Supera el límite ${tipo} (${maxSizeFormatted})\n\n` +
                    (hasUnlimited ? "" : `💎 *Pásate a Premium* para descargar hasta 2 GB\n\n`) +
                    `🔗 *Descarga directa:*\n${file.url}\n\n` +
                    `_Cópialo y ábrelo en tu navegador._`);
            }
            const filename = sanitizeFileName(file.filename || "mediafire_file");
            const ext = (filename.match(/\.[a-zA-Z0-9]{1,6}$/)?.[0] || "").toLowerCase();
            /* ============ CAPTION CON AVISO DE TIEMPO ============ */
            let timeWarning = "";
            if (sizeBytes && sizeBytes > ONE_GB) {
                timeWarning =
                    `\n> ⏳ *Este archivo pesa más de 1 GB.*\n` +
                        `> *Puede tardar entre 5 y 10 minutos en llegar.*\n` +
                        `> *Ten paciencia, por favor.* 🙏`;
            }
            else {
                timeWarning = `\n> ⏳ *Descargando archivo, por favor espera...*`;
            }
            const caption = `╭━━━〔 📥 𝗠𝗘𝗗𝗜𝗔𝗙𝗜𝗥𝗘 〕━━━⬣\n` +
                `┃ ⬢ 📄 𝗡𝗢𝗠𝗕𝗥𝗘 : ${filename}\n` +
                `┃ ⬢ 💾 𝗣𝗘𝗦𝗢   : ${file.filesize || "Desconocido"}\n` +
                `┃ ⬢ 🔧 𝗧𝗜𝗣𝗢   : ${file.mimetype}\n` +
                `┃ ⬢ ${file.power}\n` +
                `╰━━━━━━━━━━━━━━⬣\n` +
                timeWarning;
            const captionMsg = await m.reply(caption);
            userCaptions.set(m.sender, captionMsg);
            /* ============ DESCARGAR A DISCO CON STREAM ============ */
            tmpFile = path.join(TMP_DIR, `mf_${Date.now()}_${filename}`);
            console.log(`[mediafire] Descargando ${file.url} → ${tmpFile}`);
            const dlRes = await fetch(file.url, {
                headers: { "User-Agent": "Mozilla/5.0" }
            });
            if (!dlRes.ok) {
                throw new Error(`Download failed: HTTP ${dlRes.status} ${dlRes.statusText}`);
            }
            await pipeline(dlRes.body, fs.createWriteStream(tmpFile));
            const stat = fs.statSync(tmpFile);
            const downloadedMB = (stat.size / 1024 / 1024).toFixed(2);
            console.log(`[mediafire] ✅ Descargado: ${downloadedMB} MB`);
            if (stat.size < 1024) {
                throw new Error("Archivo descargado vacío o corrupto");
            }
            /* ============ ENVIAR ============ */
            console.log(`[mediafire] Enviando (${downloadedMB} MB)...`);
            // Leer el archivo como buffer (Baileys lo maneja mejor)
            const buffer = fs.readFileSync(tmpFile);
            await conn.sendMessage(m.chat, {
                document: buffer, // 👈 buffer, no stream
                fileName: filename,
                mimetype: mimeFromExt(ext),
            }, { quoted: m });
            console.log(`[mediafire] ✅ Enviado OK`);
            await m.react("✅");
            m.success = true;
            /* ============ LIMPIAR DESPUÉS DE 2 MIN ============ */
            setTimeout(() => {
                try {
                    if (tmpFile && fs.existsSync(tmpFile)) {
                        fs.unlinkSync(tmpFile);
                        console.log(`[mediafire] 🧹 Limpiado: ${tmpFile}`);
                    }
                }
                catch { }
            }, 120000);
        }
        catch (err) {
            console.error("❌ Error Mediafire:", err?.message || err);
            if (tmpFile) {
                try {
                    if (fs.existsSync(tmpFile))
                        fs.unlinkSync(tmpFile);
                }
                catch { }
            }
            await m.react("❌");
            await conn.sendFile(m.chat, stickerError, "error.webp", "", m);
        }
        finally {
            delete userRequests[m.sender];
        }
    }
};
/* ================= MIME ================= */
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
