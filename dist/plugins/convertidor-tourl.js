import fetch from "node-fetch";
import FormDataNode from "form-data";
import uploadFile, { quax, RESTfulAPI, catbox, uguu, filechan, pixeldrain, gofile, krakenfiles, telegraph } from "../lib/uploadFile.js";
import uploadImage from "../lib/uploadImage.js";
function toArrayBuffer(buffer) {
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}
function detectFile(m, mimeRaw) {
    let mime = mimeRaw || "";
    if (mime === "video" && m?.message?.videoMessage) {
        mime = m.message.videoMessage.mimetype || "video/mp4";
    }
    if (mime === "audio" && m?.message?.audioMessage) {
        mime = m.message.audioMessage.mimetype || "audio/ogg";
    }
    if (mime === "image" && m?.message?.imageMessage) {
        mime = m.message.imageMessage.mimetype || "image/jpeg";
    }
    if (/^image\//.test(mime)) {
        return {
            type: "image",
            ext: mime.split("/")[1]?.replace("jpeg", "jpg") || "jpg",
            mime
        };
    }
    if (/^video\//.test(mime)) {
        return {
            type: "video",
            ext: mime.split("/")[1] || "mp4",
            mime
        };
    }
    if (/^audio\//.test(mime)) {
        let ext = "ogg";
        if (mime === "audio/mpeg")
            ext = "mp3";
        else if (mime === "audio/mp4")
            ext = "m4a";
        else if (mime === "audio/ogg" || mime === "audio/opus")
            ext = "ogg";
        return { type: "audio", ext, mime };
    }
    if (/webp/i.test(mime)) {
        return { type: "image", ext: "webp", mime: "image/webp" };
    }
    throw new Error("Tipo de archivo no soportado");
}
async function uploadMitzukiCDN(media, info) {
    const form = new FormDataNode();
    form.append("file", media, {
        filename: `upload.${info.ext}`,
        contentType: info.mime || "application/octet-stream"
    });
    const apiKey = process.env.API_KEY || "";
    if (!apiKey)
        throw new Error("Falta process.env.API_KEY");
    const res = await fetch(`https://api.mitzuki.xyz/cdn/upload?apikey=${encodeURIComponent(apiKey)}&expire=never`, {
        method: "POST",
        body: form,
        headers: form.getHeaders()
    });
    const text = await res.text();
    let json = {};
    try {
        json = JSON.parse(text);
    }
    catch { }
    console.log("[MITZUKI CDN STATUS]", res.status);
    console.log("[MITZUKI CDN RESPONSE]", text);
    if (!res.ok || !json?.status) {
        throw new Error(json?.error || json?.message || text || "Error subiendo a Mitzuki CDN");
    }
    return json.data?.url || json.data?.download_url || "";
}
const evogb = async (buffer) => {
    const form = new FormDataNode();
    form.append("file", buffer, {
        filename: `Mitzuki_${Date.now()}`,
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
    if (!json?.success || !json?.url)
        throw new Error(JSON.stringify(json));
    return json.url;
};
export default {
    name: ["tourl", "upload"],
    help: ["tourl <servicio opcional>"],
    desc: "Sube imágenes, videos, audios o stickers a servidores públicos",
    tags: ["convertidor"],
    register: true,
    run: async ({ conn, m, args, prefijo, cmd }) => {
        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || q.mimetype || "";
        if (!mime) {
            return m.reply(`${m.e?.warn || "⚠️"} *¿Y la imagen, video o audio?*\n\n` +
                `📌 *Uso:* ${prefijo + cmd}\n` +
                `> Responde a una imagen, video, audio o sticker con: *${prefijo + cmd}*\n\n` +
                `🌐 *Servidores disponibles:*\n` +
                `- ${prefijo + cmd} mitzuki\n` +
                `- ${prefijo + cmd} evogb\n` +
                `- ${prefijo + cmd} quax\n` +
                `- ${prefijo + cmd} catbox\n` +
                `- ${prefijo + cmd} sky\n` +
                `- ${prefijo + cmd} uguu\n` +
                `- ${prefijo + cmd} restfulapi\n` +
                `- ${prefijo + cmd} gofile\n` +
                `- ${prefijo + cmd} telegraph\n\n` +
                `📝 *Notas:*\n` +
                `- El archivo debe ser una imagen, sticker o video corto.\n` +
                `- Enlaces de EvoGB, mitzuki, qu.ax, catbox y Sky no expiran.\n` +
                `- CDN Mitzuki: https://api.mitzuki.xyz/cdn/upload`);
        }
        let info;
        try {
            info = detectFile(q, mime);
        }
        catch {
            return m.reply("❌ Tipo de archivo no soportado. Usa imagen, video, audio o sticker.");
        }
        const option = String(args?.[0] || "").toLowerCase();
        const services = {
            quax,
            restfulapi: RESTfulAPI,
            catbox,
            uguu,
            filechan,
            pixeldrain,
            gofile,
            krakenfiles,
            telegraph
        };
        const media = (await q.download());
        if (!media?.length)
            return m.reply("❌ No se pudo descargar el archivo.");
        console.log("SIZE MB:", (media.length / 1024 / 1024).toFixed(2));
        console.log("MIME:", info.mime);
        try {
            if (option === "mitzuki") {
                const link = await uploadMitzukiCDN(media, info);
                return m.reply(link);
            }
            if (option === "evogb") {
                const link = await evogb(media);
                return m.reply(link);
            }
            if (option === "sky") {
                const form = new FormData();
                form.append("file", new Blob([toArrayBuffer(media)], { type: info.mime }), `upload.${info.ext}`);
                const res = await fetch("https://cdn.skyultraplus.com/upload.php", {
                    method: "POST",
                    headers: { "X-API-KEY": "b18dd19ac28a4469" },
                    body: form
                });
                const json = await res.json().catch(() => ({}));
                if (!json || json.ok === false)
                    throw new Error("Upload falló");
                return m.reply(json.file?.url || json.url || "Sin URL");
            }
            if (option && services[option]) {
                const link = await services[option](media);
                return m.reply(link);
            }
            const isTele = /image\/(png|jpe?g|gif|webp)|video\/mp4/.test(info.mime);
            const link = await (isTele ? uploadImage : uploadFile)(media);
            return m.reply(link);
        }
        catch (err) {
            console.error(err);
            const opciones = Object.keys(services)
                .concat(["mitzuki", "sky", "evogb"])
                .map(v => `➔ ${prefijo}${cmd} ${v}`)
                .join("\n");
            return m.reply(`${m.e?.error || "❌"} Error al subir el archivo.\n\n` +
                `Intenta con otra opción:\n${opciones}\n\n` +
                `${err?.message || err}`);
        }
    }
};
