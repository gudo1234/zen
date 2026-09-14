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
    desc: "Convierte imágenes o videos en stickers",

    run: async ({ conn, m, prefijo, cmd, text, args }) => {
        let tmpIn = null;
        let tmpOut = null;
        let tmpFinal = null;

        try {
            // ─────────────────────────────────────
            // PACK / AUTOR
            // ─────────────────────────────────────

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

            // ─────────────────────────────────────
            // OPCIONES
            // ─────────────────────────────────────

            const inputText = String(text || args?.join(" ") || "").trim();

            const optionI = /(?:^|\s)-i(?:\s|$)/i.test(inputText);
            const optionX = /(?:^|\s)-x(?:\s|$)/i.test(inputText);
            const optionC = /(?:^|\s)-c(?:\s|$)/i.test(inputText);

            // ─────────────────────────────────────
            // DETECTAR MEDIA
            // ─────────────────────────────────────

            let q = null;

            // 1. Si responde a un mensaje multimedia
            if (m.quoted) {
                q = m.quoted;
            }

            // 2. Si el propio mensaje trae la multimedia
            if (!q) {
                q = m;
            }

            const qmsg = q?.msg || q;

            let mime =
                qmsg?.mimetype ||
                qmsg?.mediaType ||
                q?.mimetype ||
                "";

            // Normalizar
            mime = String(mime).toLowerCase();

            // ─────────────────────────────────────
            // SI EL COMANDO VIENE CON MEDIA
            // ─────────────────────────────────────

            if (!mime) {
                const directMsg = m.message || {};

                const imageMessage =
                    directMsg.imageMessage ||
                    directMsg.ephemeralMessage?.message?.imageMessage ||
                    directMsg.viewOnceMessage?.message?.imageMessage;

                const videoMessage =
                    directMsg.videoMessage ||
                    directMsg.ephemeralMessage?.message?.videoMessage ||
                    directMsg.viewOnceMessage?.message?.videoMessage;

                if (imageMessage) {
                    q = m;
                    mime = imageMessage.mimetype || "image/jpeg";
                } else if (videoMessage) {
                    q = m;
                    mime = videoMessage.mimetype || "video/mp4";
                }
            }

            // ─────────────────────────────────────
            // VALIDAR MEDIA
            // ─────────────────────────────────────

            if (!/webp|image|video/.test(mime)) {
                return m.reply(
                    null,
                    m.e.warn +
                    " *Y la imagen o video? 🤔*\n\n" +
                    `Responde a una imagen o video, o envíalos junto con ${prefijo}${cmd}.`
                );
            }

            // ─────────────────────────────────────
            // OPCIONES SOLO PARA IMÁGENES
            // ─────────────────────────────────────

            if (optionC && !mime.includes("image")) {
                return m.reply(
                    null,
                    m.e.warn +
                    " *El efecto circular solo funciona con imágenes.* 🖼️"
                );
            }

            // ─────────────────────────────────────
            // DURACIÓN DEL VIDEO
            // ─────────────────────────────────────

            if (mime.includes("video")) {
                const seconds =
                    Number(
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

            // ─────────────────────────────────────
            // DESCARGAR MEDIA
            // ─────────────────────────────────────

            let img = null;

            if (typeof q.download === "function") {
                img = await q.download();
            }

            // Fallback para mensajes donde download() no funciona
            if (!img && typeof m.download === "function") {
                img = await m.download();
            }

            if (!img) {
                return m.reply(
                    null,
                    m.e.warn +
                    " *No pude obtener la imagen o video.* 🤔\n\n" +
                    `Responde al medio o envíalo directamente junto con ${prefijo}${cmd}.`
                );
            }

            // ─────────────────────────────────────
            // NOMBRES TEMPORALES
            // ─────────────────────────────────────

            const randomName = () =>
                `${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

            tmpFinal = path.join(
                tmpdir(),
                `${randomName()}_final.webp`
            );

            // ─────────────────────────────────────
            // WEBP YA EXISTENTE
            // ─────────────────────────────────────

            if (mime.includes("webp")) {
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

            // ─────────────────────────────────────
            // ARCHIVO DE ENTRADA
            // ─────────────────────────────────────

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

            // ─────────────────────────────────────
            // FILTROS
            // ─────────────────────────────────────

            let videoFilter;

            if (mime.includes("video")) {

                // Videos siempre mantienen proporción
                // y se adaptan al sticker.
                videoFilter =
                    "scale=320:320:force_original_aspect_ratio=decrease," +
                    "pad=320:320:(ow-iw)/2:(oh-ih)/2:color=white@0," +
                    "fps=15";

            } else if (optionC) {

                // ─────────────────────────────────
                // CIRCULAR
                // ─────────────────────────────────

                videoFilter =
                    "scale=512:512:force_original_aspect_ratio=increase," +
                    "crop=512:512," +
                    "format=rgba," +
                    "geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':" +
                    "a='if(lte((X-256)^2+(Y-256)^2,256^2),255,0)'";

            } else if (optionX) {

                // ─────────────────────────────────
                // ACOPLADO 512x512
                // ─────────────────────────────────

                videoFilter =
                    "scale=512:512:force_original_aspect_ratio=decrease," +
                    "pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0";

            } else if (optionI) {

                // ─────────────────────────────────
                // AMPLIADO
                // ─────────────────────────────────

                videoFilter =
                    "scale=512:512:force_original_aspect_ratio=increase," +
                    "crop=512:512";

            } else {

                // ─────────────────────────────────
                // NORMAL
                // ─────────────────────────────────

                videoFilter =
                    "scale=320:320:force_original_aspect_ratio=decrease," +
                    "pad=320:320:(ow-iw)/2:(oh-ih)/2:color=white@0";
            }

            // ─────────────────────────────────────
            // CONVERTIR A WEBP
            // ─────────────────────────────────────

            const outputOptions = [
                "-vcodec libwebp"
            ];

            if (mime.includes("video")) {
                outputOptions.push(
                    "-loop", "0",
                    "-an",
                    "-vsync", "0",
                    "-pix_fmt", "yuva420p"
                );
            }

            outputOptions.push(
                "-vf",
                videoFilter
            );

            if (mime.includes("video")) {
                outputOptions.push(
                    "-lossless", "0",
                    "-compression_level", "6",
                    "-q:v", "60"
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

            // ─────────────────────────────────────
            // EXIF
            // ─────────────────────────────────────

            const finalSticker = await addExif(
                await fs.promises.readFile(tmpOut),
                f,
                g
            );

            await fs.promises.writeFile(
                tmpFinal,
                finalSticker
            );

            // ─────────────────────────────────────
            // ENVIAR STICKER
            // ─────────────────────────────────────

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
