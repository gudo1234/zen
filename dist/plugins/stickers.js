import { db } from "../lib/db.js";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import crypto from "crypto";
import webp from "node-webpmux";

const packnameDefault = `${m.pushName}\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n`;
const authorDefault = null;

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

            const commandText = String(
                text ||
                args?.join(" ") ||
                m.text ||
                m.body ||
                ""
            ).trim();

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

            const q = m.quoted || m;
            let qmsg = q?.msg || q;

            let mime =
                qmsg?.mimetype ||
                qmsg?.mimeType ||
                qmsg?.mediaType ||
                q?.mimetype ||
                q?.mimeType ||
                "";

            mime = String(mime).toLowerCase();

            if (!mime && m.msg) {
                qmsg = m.msg;

                mime =
                    m.msg?.mimetype ||
                    m.msg?.mimeType ||
                    m.msg?.mediaType ||
                    "";
                
                mime = String(mime).toLowerCase();
            }

            if (!mime && m.message) {
                const message =
                    m.message?.ephemeralMessage?.message ||
                    m.message?.viewOnceMessage?.message ||
                    m.message?.viewOnceMessageV2?.message ||
                    m.message;

                if (message?.imageMessage) {
                    qmsg = message.imageMessage;
                    mime = String(
                        message.imageMessage.mimetype || "image/jpeg"
                    ).toLowerCase();
                } else if (message?.videoMessage) {
                    qmsg = message.videoMessage;
                    mime = String(
                        message.videoMessage.mimetype || "video/mp4"
                    ).toLowerCase();
                } else if (message?.stickerMessage) {
                    qmsg = message.stickerMessage;
                    mime = String(
                        message.stickerMessage.mimetype || "image/webp"
                    ).toLowerCase();
                }
            }

            const isImage =
                mime.includes("image") ||
                mime.includes("webp");

            const isVideo = mime.includes("video");

            if (!isImage && !isVideo) {
                return m.reply(null, `╭  ✦ *Sticker Maker* ✦  ╮

➠ ${prefijo}${cmd} <media>
Crea un sticker de una imagen o video.

➠ ${prefijo}${cmd} -i
Amplía la imagen.

➠ ${prefijo}${cmd} -x
Acopla la imagen a 512×512.

➠ ${prefijo}${cmd} -c
Convierte la imagen en circular.

➠ ${prefijo}${cmd} -v
Voltea verticalmente.

➠ ${prefijo}${cmd} -h
Voltea horizontalmente.

➠ ${prefijo}${cmd} -d
Gira 90° a la derecha.

➠ ${prefijo}${cmd} -l
Gira 90° a la izquierda.

✐ Los efectos son *SOLO PARA IMÁGENES*.

╰━━━━━━━━━━━━━━━━`
                );
            }

            if (hasEffect && isVideo) {
                return m.reply(null, "➠ *Los efectos solo funcionan con imágenes.* 🖼️\n\n" +
                    `✐ Usa ${prefijo}${cmd} sin opciones para convertir el video.`
                );
            }

            const seconds =
                Number(qmsg?.seconds) ||
                Number(q?.seconds) ||
                Number(m.msg?.seconds) ||
                0;

            if (isVideo && seconds > 18) {
                return m.reply(
                    m.e.warn +
                    " ¿Dónde has visto un sticker de 15 segundos? Hazlo más corto, máximo 12s."
                );
            }

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
                    " *Y la imagen? 🤔* Responde a una imagen, video o sticker para hacer el sticker."
                );
            }

            tmpFinal = path.join(
                tmpdir(),
                `${Date.now()}_${crypto.randomBytes(4).toString("hex")}_final.webp`
            );

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

            const ext = isVideo ? "mp4" : "jpg";

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

            const efectos = [];

            if (optionI) {
                efectos.push(
                    "scale=512:512:force_original_aspect_ratio=increase",
                    "crop=512:512"
                );
            }

            if (optionX) {
                efectos.push(
                    "scale=512:512:force_original_aspect_ratio=decrease",
                    "pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0.0"
                );
            }

            if (optionC) {
                efectos.push(
                    "scale=512:512:force_original_aspect_ratio=increase",
                    "crop=512:512",
                    "format=rgba",
                    "geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte((X-256)^2+(Y-256)^2,256^2),255,0)'",
                    "format=yuva420p"
                );
            }

            if (optionV) {
                efectos.push("vflip");
            }

            if (optionH) {
                efectos.push("hflip");
            }

            if (optionD) {
                efectos.push("transpose=1");
            }

            if (optionL) {
                efectos.push("transpose=2");
            }

            const filtroBase =
                "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease," +
                "fps=15," +
                "pad=320:320:-1:-1:color=white@0.0," +
                "split [a][b];" +
                "[a] palettegen=reserve_transparent=on:transparency_color=ffffff [p];" +
                "[b][p] paletteuse";

            let filter;

            if (!hasEffect) {
                filter = filtroBase;
            } else {
                filter =
                    efectos.join(",") +
                    "," +
                    filtroBase;
            }

            const outputOptions = [
                "-vcodec",
                "libwebp"
            ];

            if (isVideo) {
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

            if (isVideo) {
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

            const finalSticker = await addExif(
                await fs.promises.readFile(tmpOut),
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
