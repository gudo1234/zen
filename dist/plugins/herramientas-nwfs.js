import fetch from 'node-fetch';
import FormData from 'form-data';
export default {
    name: ["detect", "nsfw", "gore"],
    help: ["detect"],
    desc: "Detecta contenido NSFW o Gore en imágenes/videos",
    tags: ["utilidad"],
    register: true,
    run: async ({ conn, m, args, prefijo, cmd }) => {
        const q = m.quoted ? m.quoted : m;
        const msg = q.message || {};
        // Verificar si hay archivo adjunto
        const hasMedia = q.message?.imageMessage ||
            q.message?.videoMessage ||
            q.message?.stickerMessage;
        if (!hasMedia) {
            return m.reply(`${m.e.warn} *¿Y la imagen o video?* 📸\n\nResponde a una imagen, video o sticker con:\n> *${prefijo + cmd}*`);
        }
        await m.react("⏳");
        try {
            const media = await q.download();
            if (!media)
                throw new Error("No se pudo descargar el archivo.");
            // Verificar tamaño (35MB máx)
            const sizeInMB = media.length / (1024 * 1024);
            if (sizeInMB > 35) {
                return m.reply(`${m.e.warn} *Archivo muy grande* 📦\nMáximo 35MB. Este pesa ${sizeInMB.toFixed(2)}MB.`);
            }
            // Determinar tipo y extensión
            let filename = 'file.jpg';
            let mimeType = 'image/jpeg';
            if (q.message?.imageMessage) {
                filename = `image_${Date.now()}.jpg`;
                mimeType = q.message.imageMessage.mimetype || 'image/jpeg';
            }
            else if (q.message?.videoMessage) {
                filename = `video_${Date.now()}.mp4`;
                mimeType = q.message.videoMessage.mimetype || 'video/mp4';
            }
            else if (q.message?.stickerMessage) {
                filename = `sticker_${Date.now()}.webp`;
                mimeType = 'image/webp';
            }
            // Subir al CDN temporal con form-data
            const form = new FormData();
            form.append('file', media, {
                filename: filename,
                contentType: mimeType
            });
            const ttl = 3600; // 1 hora
            const uploadRes = await fetch(`https://cdn.dix.lat/upload/tmp?ttl=${ttl}`, {
                method: 'POST',
                body: form,
                headers: form.getHeaders()
            });
            if (!uploadRes.ok) {
                throw new Error(`Error subiendo archivo: ${uploadRes.status}`);
            }
            const uploadJson = await uploadRes.json();
            if (!uploadJson.status) {
                throw new Error(uploadJson.error || "Error subiendo archivo");
            }
            const fileUrl = uploadJson.data.url;
            // Llamar a la API de detección
            const detectRes = await fetch(`https://api.mitzuki.xyz/tools/nsfw-check?url=${encodeURIComponent(fileUrl)}&apikey=${process.env.API_KEY}`);
            if (!detectRes.ok) {
                throw new Error(`Error en análisis: ${detectRes.status}`);
            }
            const detectJson = await detectRes.json();
            if (!detectJson.status) {
                throw new Error(detectJson.error || "Error en el análisis");
            }
            const data = detectJson.data;
            // Emojis según categoría
            const categoryEmojis = {
                'safe': '✅',
                'suggestive': '😏',
                'nsfw': '🔞',
                'explicit': '🚫',
                'gore': '💀',
                'gore_extreme': '☠️',
                'extreme_gore': '💀☠️'
            };
            const emoji = categoryEmojis[data.category] || '❓';
            // Respuesta final
            let responseText = `${emoji} *DETECCIÓN COMPLETADA*\n\n`;
            responseText += `📸 *Tipo:* ${data.type}\n`;
            responseText += `⚠️ *Inseguro:* ${data.unsafe ? '🔴 SÍ' : '🟢 NO'}\n`;
            responseText += `🏷️ *Categoría:* *${data.category.toUpperCase()}*\n`;
            responseText += `🎯 *Confianza:* ${data.confidence}%\n\n`;
            responseText += `📊 *Puntajes:*\n`;
            responseText += `└ 🔞 NSFW: ${data.scores.nsfw}%\n`;
            responseText += `└ 💀 Gore: ${data.scores.gore}%\n\n`;
            // Enviar resultado
            await conn.sendMessage(m.chat, {
                text: responseText
            }, { quoted: m });
            await m.react(data.unsafe ? '⚠️' : '✅');
        }
        catch (error) {
            console.error("❌ Error en detect:", error);
            await m.reply(`${m.e.error} *Error en la detección*\n\n${error.message || "Error desconocido"}`);
            await m.react("❌");
        }
    }
};
