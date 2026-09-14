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
    desc: "Crea stickers desde imágenes y videos",

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
            // TEXTO / OPCIONES
            // ═══════════════════════════════════════

            const inputText = String(
                text || args?.join(" ") || ""
            ).trim();

            const optionI = /(?:^|\s)-i(?:\s|$)/i.test(inputText);
            const optionX = /(?:^|\s)-x(?:\s|$)/i.test(inputText);
            const optionC = /(?:^|\s)-c(?:\s|$)/i.test(inputText);

            // Vertical
            const optionV = /(?:^|\s)-v(?:\s|$)/i.test(inputText);

            // Horizontal
            const optionH = /(?:^|\s)-h(?:\s|$)/i.test(inputText);

            // Derecha
            const optionD = /(?:^|\s)-d(?:\s|$)/i.test(inputText);

            // Izquierda
            const optionL = /(?:^|\s)-l(?:\s|$)/i.test(inputText);

            const hasEffect =
                optionI ||
                optionX ||
                optionC ||
                optionV ||
                optionH ||
                optionD ||
                optionL;

            // ═══════════════════════════════════════
            // DETECTAR MENSAJE MULTIMEDIA
            // ═══════════════════════════════════════

            let q = m.quoted || m;

            let qmsg = q?.msg || q;

            let mime =
                qmsg?.mimetype ||
                qmsg?.mediaType ||
                q?.mimetype ||
                "";

            mime = String(mime).toLowerCase();

            // ═══════════════════════════════════════
            // MEDIA DIRECTA EN EL MISMO MENSAJE
            // ═══════════════════════════════════════

            if (!mime) {
                const message = m.message || {};

                const directImage =
                    message.imageMessage ||
                    message.ephemeralMessage?.message?.imageMessage ||
                    message.viewOnceMessage?.message?.imageMessage ||
                    message.viewOnceMessageV2?.message?.imageMessage;

                const directVideo =
                    message.videoMessage ||
                    message.ephemeralMessage?.message?.videoMessage ||
                    message.viewOnceMessage?.message?.videoMessage ||
                    message.viewOnceMessageV2?.message?.videoMessage;

                if (directImage) {
                    q = m;
                    qmsg = directImage;
                    mime = directImage.mimetype || "image/jpeg";
                }

                if (directVideo) {
                    q = m;
                    qmsg = directVideo;
                    mime = directVideo.mimetype || "video/mp4";
                }
            }

            // ═══════════════════════════════════════
            // SIN MEDIA → MOSTRAR TUTORIAL
            // ═══════════════════════════════════════

            if (!/webp|image|video/.test(mime)) {

                return m.reply(
                    `╭━━━〔 ✦ *STICKER MAKER* ✦ 〕━━━╮

> Crea stickers a partir de imágenes, videos o URLs.

╭  ✦ *¿Cómo usarlo?* ✦  ╮

⭔ *Responde a una imagen o video:*
   ${prefijo}${cmd}

⭔ *También puedes enviar la imagen/video junto al comando:*
   ${prefijo}${cmd}

╭  ✦ *Efectos para imágenes* ✦  ╮

⭔ *-i* ↷
Ampliado.

   ${prefijo}${cmd} -i

⭔ *-x* ↷
Acoplado en 512×512.

   ${prefijo}${cmd} -x

⭔ *-c* ↷
Circular.

   ${prefijo}${cmd} -c

⭔ *-v* ↷
Vertical.

   ${prefijo}${cmd} -v

⭔ *-h* ↷
Horizontal.

   ${prefijo}${cmd} -h

⭔ *-d* ↷
Acoplado hacia la derecha.

   ${prefijo}${cmd} -d

⭔ *-l* ↷
Acoplado hacia la izquierda.

   ${prefijo}${cmd} -l

╭  ✦ *Ejemplos* ✦  ╮

⭔ ${prefijo}${cmd} *<reply media>*
↳ Sticker normal.

⭔ ${prefijo}${cmd} *<reply imagen> -x*
↳ Sticker 512×512.

⭔ ${prefijo}${cmd} *<reply imagen> -c*
↳ Sticker circular.

⭔ ${prefijo}${cmd} *<reply imagen> -v*
↳ Sticker vertical.

⭔ ${prefijo}${cmd} *<reply imagen> -h*
↳ Sticker horizontal.

⭔ ${prefijo}${cmd} *<reply imagen> -d*
↳ Imagen colocada hacia la derecha.

⭔ ${prefijo}${cmd} *<reply imagen> -l*
↳ Imagen colocada hacia la izquierda.

╰━━━━━━━━━━━━━━━━━━━━╯

> ⚠️ *Importante:* Los efectos `-i`, `-x`, `-c`, `-v`, `-h`, `-d` y `-l` funcionan *SOLO CON IMÁGENES*.
> Los videos únicamente pueden convertirse a sticker de forma normal.`
                );
            }

            // ═══════════════════════════════════════
            // FORMAS SOLO PARA IMÁGENES
            // ═══════════════════════════════════════

            if (hasEffect && mime.includes("video")) {

                return m.reply(
                    m.e.warn +
                    " *Los efectos solo funcionan con imágenes.* 🖼️\n\n" +
                    "Para convertir este video a sticker usa simplemente:\n\n" +
                    `⭔ ${prefijo}${cmd}\n\n` +
                    "Ejemplo:\n" +
                    `⭔ Responde al video con ${prefijo}${cmd}\n\n` +
                    "Los efectos `-i`, `-x`, `-c`, `-v`, `-h`, `-d` y `-l` no están disponibles para videos."
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
                        " ¿Dónde has visto un sticker de 15 segundos? Hazlo más corto, máximo 18s."
                    );
                }
            }

            // ═══════════════════════════════════════
            // DESCARGAR MEDIA
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
                    m.e.warn +
                    " *No pude descargar la imagen o video.* 🤔\n\n" +
                    "Intenta responder directamente al archivo multimedia."
                );
            }

            // ═══════════════════════════════════════
            // ARCHIVOS TEMPORALES
            // ═══════════════════════════════════════

            const randomName = () =>
                `${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

            tmpFinal = path.join(
                tmpdir(),
                `${randomName()}_final.webp`
            );

            // ═══════════════════════════════════════
            // WEBP
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
            // ENTRADA
            // ═══════════════════════════════════════

            const ext = mime.includes("video")
                ? "mp4"
                : "jpg";

            tmpIn = path.join(
                tmpdir(),
                `${randomName()}.${ext}`
            );

            tmpOut = path.join(
                tmpdir(),
                `${randomName()}.webp`
            );

            await fs.promises.writeFile(
                tmpIn,
                img
            );

            // ═══════════════════════════════════════
            // FILTRO NORMAL
            // ═══════════════════════════════════════

            let videoFilter;

            /*
             * IMPORTANTE:
             * Este es el mismo procesamiento normal
             * de tu código original.
             *
             * Si no se coloca ninguna opción,
             * no se aplica ninguna forma adicional.
             */

            if (!hasEffect) {

                videoFilter =
                    "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease," +
                    "fps=15," +
                    "pad=320:320:-1:-1:color=white@0.0";

            }

            // ═══════════════════════════════════════
            // AMPLIADO
            // ═══════════════════════════════════════

            else if (optionI) {

                videoFilter =
                    "scale=512:512:force_original_aspect_ratio=increase," +
                    "crop=512:512";
            }

            // ═══════════════════════════════════════
            // 512 × 512
            // ═══════════════════════════════════════

            else if (optionX) {

                videoFilter =
                    "scale=512:512:force_original_aspect_ratio=decrease," +
                    "pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0";
            }

            // ═══════════════════════════════════════
            // CIRCULAR
            // ═══════════════════════════════════════

            else if (optionC) {

                videoFilter =
                    "scale=512:512:force_original_aspect_ratio=increase," +
                    "crop=512:512," +
                    "format=rgba," +
                    "geq=" +
                    "r='r(X,Y)':" +
                    "g='g(X,Y)':" +
                    "b='b(X,Y)':" +
                    "a='if(lte((X-256)^2+(Y-256)^2,256^2),255,0)'";
            }

            // ═══════════════════════════════════════
            // VERTICAL
            // ═══════════════════════════════════════

            else if (optionV) {

                videoFilter =
                    "scale=512:512:force_original_aspect_ratio=decrease," +
                    "pad=512:640:(ow-iw)/2:(oh-ih)/2:color=white@0";
            }

            // ═══════════════════════════════════════
            // HORIZONTAL
            // ═══════════════════════════════════════

            else if (optionH) {

                videoFilter =
                    "scale=512:512:force_original_aspect_ratio=decrease," +
                    "pad=640:512:(ow-iw)/2:(oh-ih)/2:color=white@0";
            }

            // ═══════════════════════════════════════
            // DERECHA
            // ═══════════════════════════════════════

            else if (optionD) {

                videoFilter =
                    "scale=450:450:force_original_aspect_ratio=decrease," +
                    "pad=512:512:62:31:color=white@0";
            }

            // ═══════════════════════════════════════
            // IZQUIERDA
            // ═══════════════════════════════════════

            else if (optionL) {

                videoFilter =
                    "scale=450:450:force_original_aspect_ratio=decrease," +
                    "pad=512:512:0:31:color=white@0";
            }

            // ═══════════════════════════════════════
            // CONVERTIR A WEBP
            // ═══════════════════════════════════════

            const outputOptions = [
                "-vcodec",
                "libwebp"
            ];

            // Videos: animación
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
                videoFilter
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
