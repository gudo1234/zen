import { db } from "../lib/db.js";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import crypto from "crypto";
import webp from "node-webpmux";

const packnameDefault = "𝗦𝗧𝗜𝗖𝗞𝗘𝗥𝗦❤️‍🔥 - Mitzuki\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n";
const authorDefault = "Owner: @elrebelde21\n• Dueña: @itschinita_official";

async function addExif(webpSticker, packname, author, categories = [""]) {
    const img = new webp.Image();

    const stickerPackId = crypto.randomBytes(32).toString("hex");

    const json = {
        "sticker-pack-id": stickerPackId,
        "sticker-pack-name": packname,
        "sticker-pack-publisher": author,
        emojis: categories
    };

    const exifAttr = Buffer.from([
        0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x16, 0x00, 0x00, 0x00
    ]);

    const jsonBuffer = Buffer.from(JSON.stringify(json), "utf8");
    const exif = Buffer.concat([exifAttr, jsonBuffer]);

    exif.writeUIntLE(jsonBuffer.length, 14, 4);

    await img.load(webpSticker);
    img.exif = exif;

    return await img.save(null);
}

export default {
    name: ["s", "sticker"],
    help: ["s", "sticker"],
    tags: ["sticker"],
    desc: "Convierte imagen o video en sticker",

    run: async ({ conn, m, prefijo, cmd, text, args }) => {

        let tmpIn = null;
        let tmpOut = null;
        let tmpFinal = null;

        try {

            // ═══════════════════════════════════════
            // PACK / AUTOR
            // ═══════════════════════════════════════

            const userResult = await db.query(
                "SELECT sticker_packname, sticker_author FROM usuarios WHERE id = $1",
                [m.sender]
            );

            const user = userResult.rows[0] || {};

            let f;
            let g;

            if (user.sticker_packname && user.sticker_author) {
                f = user.sticker_packname;
                g = user.sticker_author;
            } else if (user.sticker_packname && !user.sticker_author) {
                f = user.sticker_packname;
                g = authorDefault;
            } else {
                f = packnameDefault;
                g = authorDefault;
            }

            // ═══════════════════════════════════════
            // TEXTO DEL COMANDO
            // ═══════════════════════════════════════

            const commandText = String(
                text ||
                args?.join(" ") ||
                m.text ||
                m.body ||
                ""
            ).trim();

            // ═══════════════════════════════════════
            // EFECTOS
            // ═══════════════════════════════════════

            const optionI = /(?:^|\s)-i(?:\s|$)/i.test(commandText);
            const optionX = /(?:^|\s)-x(?:\s|$)/i.test(commandText);
            const optionC = /(?:^|\s)-c(?:\s|$)/i.test(commandText);
            const optionV = /(?:^|\s)-v(?:\s|$)/i.test(commandText);
            const optionH = /(?:^|\s)-h(?:\s|$)/i.test(commandText);
            const optionD = /(?:^|\s)-d(?:\s|$)/i.test(commandText);
            const optionL = /(?:^|\s)-l(?:\s|$)/i.test(commandText);

            const hasEffect =
                optionI ||
                optionX ||
                optionC ||
                optionV ||
                optionH ||
                optionD ||
                optionL;

            // ═══════════════════════════════════════
            // DETECTAR MEDIA
            // ═══════════════════════════════════════

            const q = m.quoted ? m.quoted : m;

            let qmsg = q?.msg || q;

            let mime =
                qmsg?.mimetype ||
                qmsg?.mimeType ||
                qmsg?.mediaType ||
                q?.mimetype ||
                q?.mimeType ||
                "";

            mime = String(mime).toLowerCase();

            // ═══════════════════════════════════════
            // MEDIA DIRECTA EN EL MISMO MENSAJE
            // ═══════════════════════════════════════

            if (!mime && m.message) {

                const message =
                    m.message?.ephemeralMessage?.message ||
                    m.message?.viewOnceMessage?.message ||
                    m.message?.viewOnceMessageV2?.message ||
                    m.message;

                if (message?.imageMessage) {
                    qmsg = message.imageMessage;
                    mime = message.imageMessage.mimetype || "image/jpeg";
                }

                if (message?.videoMessage) {
                    qmsg = message.videoMessage;
                    mime = message.videoMessage.mimetype || "video/mp4";
                }

                if (message?.stickerMessage) {
                    qmsg = message.stickerMessage;
                    mime = message.stickerMessage.mimetype || "image/webp";
                }
            }

            // ═══════════════════════════════════════
            // SIN MEDIA → TUTORIAL
            // ═══════════════════════════════════════

            if (!/webp|image|video/.test(mime)) {

                return m.reply(
`╭  ✦ *Sticker Maker* ✦  ╮

> Crea stickers a partir de imágenes, videos o URLs.

ᯓ  *⌞efectos⌝*

⭔ *-i* ↷
Ampliado.

⭔ *-x* ↷
Acoplado (512×512).

⭔ *-c* ↷
Circular.

⭔ *-v* ↷
Vertical.

⭔ *-h* ↷
Horizontal.

⭔ *-d* ↷
Acoplado hacia la derecha.

⭔ *-l* ↷
Acoplado hacia la izquierda.

ᯓ  *⌞ejemplos⌝*

⭔ ${prefijo}${cmd} *<reply media>* ↷
Crea un sticker desde una imagen o video.

⭔ ${prefijo}${cmd} *<reply imagen> -i* ↷
Crea un sticker ampliado.

⭔ ${prefijo}${cmd} *<reply imagen> -x* ↷
Crea un sticker acoplado a 512×512.

⭔ ${prefijo}${cmd} *<reply imagen> -c* ↷
Crea un sticker circular.

⭔ ${prefijo}${cmd} *<reply imagen> -v* ↷
Crea un sticker vertical.

⭔ ${prefijo}${cmd} *<reply imagen> -h* ↷
Crea un sticker horizontal.

⭔ ${prefijo}${cmd} *<reply imagen> -d* ↷
Coloca la imagen hacia la derecha.

⭔ ${prefijo}${cmd} *<reply imagen> -l* ↷
Coloca la imagen hacia la izquierda.

ᯓ  *⌞importante⌝*

> El sticker normal no aplica ninguna forma.
> Los efectos funcionan *SOLO con imágenes*.

> Los videos se convierten normalmente usando:
> ${prefijo}${cmd} *<reply video>*

╰━━━━━━━━━━━━━━━━━━━━╯`
                );
            }

            // ═══════════════════════════════════════
            // EFECTOS SOLO PARA IMÁGENES
            // ═══════════════════════════════════════

            if (hasEffect && mime.includes("video")) {

                return m.reply(
                    m.e.warn +
                    ` *Los efectos solo funcionan con imágenes.* 🖼️\n\n` +
                    `Para convertir este video normalmente responde con:\n\n` +
                    `⭔ ${prefijo}${cmd}\n\n` +
                    `No puedes utilizar -i, -x, -c, -v, -h, -d ni -l con videos.`
                );
            }

            // ═══════════════════════════════════════
            // DURACIÓN DEL VIDEO
            // ═══════════════════════════════════════

            if (mime.includes("video")) {

                const seconds = Number(
                    qmsg?.seconds ||
                    qmsg?.duration ||
                    q?.seconds ||
                    0
                );

                if (seconds > 18) {
                    return m.reply(
                        m.e.warn +
                        " ¿Dónde has visto un sticker de 15 segundos? Hazlo más corto, máximo 12s."
                    );
                }
            }

            // ═══════════════════════════════════════
            // DESCARGAR
            // ═══════════════════════════════════════

            let img = null;

            if (typeof q.download === "function") {
                img = await q.download();
            }

            if (!img && typeof m.download === "function") {
                img = await m.download();
            }

            if (!img) {
                return m.reply(
                    null,
                    m.e.warn +
                    " *Y la imagen? 🤔* Responde a una imagen, video o sticker para hacer el sticker."
                );
            }

            // ═══════════════════════════════════════
            // ARCHIVO FINAL
            // ═══════════════════════════════════════

            tmpFinal = path.join(
                tmpdir(),
                `${Date.now()}_${crypto.randomBytes(4).toString("hex")}_final.webp`
            );

            // ═══════════════════════════════════════
            // WEBP SIN EFECTOS
            // ═══════════════════════════════════════

            if (mime.includes("webp") && !hasEffect) {

                const finalSticker = await addExif(
                    img,
                    f,
                    g
                );

                await fs.promises.writeFile(
                    tmpFinal,
                    finalSticker
                );

                await conn.sendFile(
                    m.chat,
                    tmpFinal,
                    "sticker.webp",
                    "",
                    m,
                    false,
                    {
                        asSticker: true,
                        isAiSticker: true
                    }
                );

                return;
            }

            // ═══════════════════════════════════════
            // ARCHIVO DE ENTRADA
            // ═══════════════════════════════════════

            const ext = mime.includes("video")
                ? "mp4"
                : "jpg";

            tmpIn = path.join(
                tmpdir(),
                `${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${ext}`
            );

            tmpOut = path.join(
                tmpdir(),
                `${Date.now()}_${crypto.randomBytes(4).toString("hex")}.webp`
            );

            await fs.promises.writeFile(
                tmpIn,
                img
            );

            // ═══════════════════════════════════════
            // FILTRO
            // ═══════════════════════════════════════

            let filter;

            // ───────────────────────────────────────
            // NORMAL
            // EXACTAMENTE COMO TU CÓDIGO ORIGINAL
            // ───────────────────────────────────────

            if (!hasEffect) {

                filter =
                    "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease," +
                    "fps=15," +
                    "pad=320:320:-1:-1:color=white@0.0," +
                    "split [a][b];" +
                    "[a] palettegen=reserve_transparent=on:transparency_color=ffffff [p];" +
                    "[b][p] paletteuse";
            }

            // ───────────────────────────────────────
            // AMPLIADO
            // ───────────────────────────────────────

            else if (optionI) {

                filter =
                    "scale=512:512:force_original_aspect_ratio=increase," +
                    "crop=512:512";
            }

            // ───────────────────────────────────────
            // 512×512
            // ───────────────────────────────────────

            else if (optionX) {

                filter =
                    "scale=512:512:force_original_aspect_ratio=decrease," +
                    "pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0.0";
            }

            // ───────────────────────────────────────
            // CIRCULAR
            // ───────────────────────────────────────

            else if (optionC) {

                filter =
                    "scale=512:512:force_original_aspect_ratio=increase," +
                    "crop=512:512," +
                    "format=rgba," +
                    "geq=" +
                    "r='r(X,Y)':" +
                    "g='g(X,Y)':" +
                    "b='b(X,Y)':" +
                    "a='if(lte((X-256)^2+(Y-256)^2,256^2),255,0)'," +
                    "format=yuva420p";
            }

            // ───────────────────────────────────────
            // VERTICAL
            // ───────────────────────────────────────

            else if (optionV) {

                filter =
                    "scale=512:640:force_original_aspect_ratio=decrease," +
                    "pad=512:640:(ow-iw)/2:(oh-ih)/2:color=white@0.0";
            }

            // ───────────────────────────────────────
            // HORIZONTAL
            // ───────────────────────────────────────

            else if (optionH) {

                filter =
                    "scale=640:512:force_original_aspect_ratio=decrease," +
                    "pad=640:512:(ow-iw)/2:(oh-ih)/2:color=white@0.0";
            }

            // ───────────────────────────────────────
            // DERECHA
            // ───────────────────────────────────────

            else if (optionD) {

                filter =
                    "scale=450:450:force_original_aspect_ratio=decrease," +
                    "pad=512:512:62:(oh-ih)/2:color=white@0.0";
            }

            // ───────────────────────────────────────
            // IZQUIERDA
            // ───────────────────────────────────────

            else if (optionL) {

                filter =
                    "scale=450:450:force_original_aspect_ratio=decrease," +
                    "pad=512:512:0:(oh-ih)/2:color=white@0.0";
            }

            // ═══════════════════════════════════════
            // CONVERSIÓN
            // ═══════════════════════════════════════

            const outputOptions = [
                "-vcodec",
                "libwebp"
            ];

            // Video animado
            if (mime.includes("video")) {

                outputOptions.push(
                    "-loop",
                    "0",
                    "-an",
                    "-vsync",
                    "0",
                    "-pix_fmt",
                    "yuva420p"
                );
            }

            outputOptions.push(
                "-vf",
                filter
            );

            if (mime.includes("video")) {

                outputOptions.push(
                    "-lossless",
                    "0",
                    "-compression_level",
                    "6",
                    "-q:v",
                    "60"
                );
            }

            await new Promise((resolve, reject) => {

                ffmpeg(tmpIn)
                    .inputOptions(["-y"])
                    .outputOptions(outputOptions)
                    .toFormat("webp")
                    .save(tmpOut)
                    .on("end", resolve)
                    .on("error", reject);
            });

            // ═══════════════════════════════════════
            // EXIF
            // ═══════════════════════════════════════

            const finalSticker = await addExif(
                await fs.promises.readFile(tmpOut),
                f,
                g
            );

            await fs.promises.writeFile(
                tmpFinal,
                finalSticker
            );

            // ═══════════════════════════════════════
            // ENVIAR
            // ═══════════════════════════════════════

            await conn.sendFile(
                m.chat,
                tmpFinal,
                "sticker.webp",
                "",
                m,
                false,
                {
                    asSticker: true,
                    isAiSticker: true
                }
            );

        } catch (err) {

            console.error("❌ Error en /s:", err);

            return m.reply(
                m.e.error +
                " *Error creando el sticker.*"
            );

        } finally {

            for (const file of [
                tmpIn,
                tmpOut,
                tmpFinal
            ]) {

                if (file && fs.existsSync(file)) {

                    try {
                        fs.unlinkSync(file);
                    } catch {}
                }
            }
        }
    }
};
