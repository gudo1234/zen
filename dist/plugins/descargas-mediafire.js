import axios from "axios";

const userRequests = {};
const userCaptions = new Map();

const mimeTypes = {
    "7z": "application/x-7z-compressed",
    "zip": "application/zip",
    "rar": "application/vnd.rar",
    "apk": "application/vnd.android.package-archive",
    "tar": "application/x-tar",
    "gz": "application/gzip",
    "tgz": "application/gzip",
    "bz2": "application/x-bzip2",

    "mp4": "video/mp4",
    "mkv": "video/x-matroska",
    "avi": "video/x-msvideo",
    "mov": "video/quicktime",
    "wmv": "video/x-ms-wmv",

    "mp3": "audio/mpeg",
    "wav": "audio/wav",
    "ogg": "audio/ogg",
    "flac": "audio/flac",
    "m4a": "audio/mp4",
    "aac": "audio/aac",

    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "webp": "image/webp",
    "bmp": "image/bmp",
    "svg": "image/svg+xml",

    "pdf": "application/pdf",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xls": "application/vnd.ms-excel",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "ppt": "application/vnd.ms-powerpoint",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",

    "txt": "text/plain",
    "csv": "text/csv",
    "html": "text/html",
    "json": "application/json",
    "xml": "application/xml",
    "js": "text/javascript",
    "py": "text/x-python",

    "exe": "application/vnd.microsoft.portable-executable",
    "msi": "application/x-msi",
    "jar": "application/java-archive",

    "mcaddon": "application/x-mcaddon",
    "mcpack": "application/x-mcpack",
    "mcworld": "application/x-mcworld",

    "iso": "application/x-iso9660-image",
    "bin": "application/octet-stream"
};

export default {
    name: ["mediafire", "mediafiredl", "dlmediafire", "mf"],
    help: ["mediafire <url>"],
    desc: "Descarga archivos desde MediaFire usando Delirius.",
    tags: ["downloader"],
    register: true,
    limitPrem: true,
    limit: 3,

    run: async ({ conn, m, args, prefijo, cmd }) => {
        const stickerError = "https://qu.ax/Wdsb.webp";

        if (!args[0]) {
            return m.reply(
                `${m.e.warn} *Ingresa un enlace válido de MediaFire.*\n\n` +
                `📌 Ejemplo:\n${prefijo + cmd} https://www.mediafire.com/file/xxxxx/archivo.apk/file`
            );
        }

        const link = args[0].trim();

        if (!/^https?:\/\/(?:www\.)?mediafire\.com\/file\//i.test(link)) {
            return m.reply(`${m.e.warn} *El enlace no parece ser válido de MediaFire.*`);
        }

        if (userRequests[m.sender]) {
            await conn.reply(
                m.chat,
                `${m.e.warn} Hey @${m.sender.split("@")[0]}, ya estás descargando algo 🙄\nEspera a que termine tu solicitud actual.`,
                userCaptions.get(m.sender) || m
            );
            return;
        }

        userRequests[m.sender] = true;

        await m.react("🕒");

        try {
            // API ÚNICA: DELIRIUS ONLINE
            const api =
                `https://api.delirius.online/download/mediafire?url=${encodeURIComponent(link)}`;

            const response = await axios.get(api, {
                timeout: 30000
            });

            const data = response.data;

            if (!data?.status || !data?.data?.link) {
                throw new Error("Delirius no devolvió un enlace de descarga.");
            }

            const info = data.data;

            const filename = info.filename || "archivo";

            const extension =
                info.extension?.toLowerCase() ||
                filename.split(".").pop()?.toLowerCase() ||
                "";

            const mimetype =
                info.mime ||
                mimeTypes[extension] ||
                "application/octet-stream";

            // Descargar el archivo real
            const file = await axios.get(info.link, {
                responseType: "arraybuffer",
                timeout: 120000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
                }
            });

            if (!file.data?.byteLength) {
                throw new Error("El archivo descargado está vacío.");
            }

            const caption = `*Name:* ${filename}
*Peso:* ${info.size || "Desconocido"}
*Tipo:* ${mimetype}
*Extención:* ${extension}

> ⏳ *Enviando archivo, por favor espera...*`.trim();

            const captionMsg = await m.reply(caption);

            userCaptions.set(m.sender, captionMsg);

            await conn.sendMessage(
                m.chat,
                {
                    document: Buffer.from(file.data),
                    fileName: filename,
                    mimetype
                },
                {
                    quoted: m
                }
            );

            await m.react("✅");
            m.success = true;

        } catch (err) {
            console.error("❌ Error MediaFire/Delirius:", err);

            await m.react("❌");

            await conn.sendFile(
                m.chat,
                stickerError,
                "error.webp",
                "",
                m
            );

        } finally {
            delete userRequests[m.sender];
            userCaptions.delete(m.sender);
        }
    }
};
