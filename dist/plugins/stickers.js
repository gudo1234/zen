import { db } from "../lib/db.js";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import crypto from "crypto";
import webp from "node-webpmux";

const packnameDefault = "𝗦𝗧𝗜𝗖𝗞𝗘𝗥𝗦❤️‍🔥 - Mitzuki\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n";
const authorDefault = "Owner: @elrebelde21\n• Dueña: @itschinita_official";

const shapeFlags = {
    "-c": "circle",
    "-t": "triangle",
    "-d": "diamond",
    "-g": "hexagon",
    "-p": "pentagon",
    "-a": "heart",
    "-b": "blob",
    "-l": "leaf",
    "-n": "moon",
    "-s": "star",
    "-z": "zap",
    "-r": "curve",
    "-e": "edges",
    "-m": "mirror",
    "-f": "arrow",
    "-x": "attach",
    "-i": "expand",
    "-h": "flip-horizontal",
    "-v": "flip-vertical"
};

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
        0x49, 0x49, 0x2A, 0x00,
        0x08, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x41, 0x57,
        0x07, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x16, 0x00,
        0x00, 0x00
    ]);

    const jsonBuffer = Buffer.from(
        JSON.stringify(json),
        "utf8"
    );

    const exif = Buffer.concat([
        exifAttr,
        jsonBuffer
    ]);

    exif.writeUIntLE(
        jsonBuffer.length,
        14,
        4
    );

    await img.load(webpSticker);
    img.exif = exif;

    return await img.save(null);
}

export default {
    name: ["s", "sticker", "stiker"],
    help: ["s", "sticker"],
    tags: ["sticker"],
    desc: "Convierte imagen o video en sticker con formas personalizadas",

    run: async ({ conn, m, prefijo, cmd }) => {

        let tmpIn = null;
        let tmpOut = null;
        let tmpFinal = null;
        let tmpFrame = null;
        let tmpMask = null;

        try {

            // ─────────────────────────────
            // PACKNAME / AUTHOR
            // ─────────────────────────────

            const userResult = await db.query(
                "SELECT sticker_packname, sticker_author FROM usuarios WHERE id = $1",
                [m.sender]
            );

            const user = userResult.rows[0] || {};

            let f, g;

            if (user.sticker_packname && user.sticker_author) {
                f = user.sticker_packname;
                g = user.sticker_author;
            }
            else if (user.sticker_packname && !user.sticker_author) {
                f = user.sticker_packname;
                g = authorDefault;
            }
            else {
                f = packnameDefault;
                g = authorDefault;
            }

            // ─────────────────────────────
            // MENSAJE CITADO
            // ─────────────────────────────

            const q = m.quoted ? m.quoted : m;

            const mime =
                (q.msg || q).mimetype ||
                q.mediaType ||
                "";

            // ─────────────────────────────
            // DETECTAR FORMA
            // ─────────────────────────────

            const args = m.text
                ? m.text.trim().split(/\s+/)
                : [];

            const selectedFlag = args.find(
                arg => Object.prototype.hasOwnProperty.call(
                    shapeFlags,
                    arg.toLowerCase()
                )
            );

            const selectedShape =
                selectedFlag
                    ? shapeFlags[selectedFlag.toLowerCase()]
                    : null;

            // ─────────────────────────────
            // SIN MEDIA
            // ─────────────────────────────

            if (!/webp|image|video|gif/i.test(mime)) {

                return m.reply(
                    null,
                    m.e.warn +
                    ` *¿Y la imagen o video? 🤔*

Responde a una imagen, video o GIF para crear un sticker.

┌🎨 *Formas disponibles:*
│
│ *Básicas*
│ ├─ -c → Circular
│ ├─ -t → Triangular
│ ├─ -d → Diamante
│ ├─ -g → Hexágono
│ └─ -p → Pentágono
│
│ *Decorativas*
│ ├─ -a → Corazón
│ ├─ -b → Burbuja
│ ├─ -l → Hoja
│ ├─ -n → Luna
│ ├─ -s → Estrella
│ └─ -z → Rayo
│
│ *Especiales*
│ ├─ -r → Curvado
│ ├─ -e → Esquinas redondeadas
│ ├─ -m → Espejo
│ ├─ -f → Flecha
│ ├─ -x → Acoplado
│ ├─ -i → Ampliado
│ ├─ -h → Horizontal
│ └─ -v → Vertical
└──────────────

◈ *Ejemplo:*
Responde a una imagen con:
${prefijo}${cmd} -a`
                );
            }

            // ─────────────────────────────
            // LÍMITE DE VIDEO
            // ─────────────────────────────

            if (
                /video|gif/i.test(mime) &&
                Number((q.msg || q).seconds || 0) > 18
            ) {

                return m.reply(
                    m.e.warn +
                    " ¿Dónde has visto un sticker de 15 segundos? Hazlo más corto, máximo 18s."
                );
            }

            // ─────────────────────────────
            // DESCARGAR
            // ─────────────────────────────

            const img = await q.download?.();

            if (!img) {

                return m.reply(
                    null,
                    m.e.warn +
                    " *Y la imagen? 🤔* Responde a una imagen, video o sticker para hacer el sticker."
                );
            }

            // ─────────────────────────────
            // ARCHIVO FINAL
            // ─────────────────────────────

            tmpFinal = path.join(
                tmpdir(),
                `${Date.now()}_${crypto.randomBytes(4).toString("hex")}_final.webp`
            );

            // ─────────────────────────────
            // WEBP SIN FORMA
            // ─────────────────────────────

            if (
                mime.includes("webp") &&
                !selectedShape
            ) {

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

            // ─────────────────────────────
            // VIDEO/GIF SIN FORMA
            // → STICKER ANIMADO
            // ─────────────────────────────

            if (
                /video|gif/i.test(mime) &&
                !selectedShape
            ) {

                tmpIn = path.join(
                    tmpdir(),
                    `${Date.now()}_${crypto.randomBytes(4).toString("hex")}.mp4`
                );

                tmpOut = path.join(
                    tmpdir(),
                    `${Date.now()}_${crypto.randomBytes(4).toString("hex")}.webp`
                );

                await fs.promises.writeFile(
                    tmpIn,
                    img
                );

                await new Promise((resolve, reject) => {

                    ffmpeg(tmpIn)
                        .inputOptions(["-y"])
                        .outputOptions([
                            "-vcodec libwebp",
                            "-vf",
                            "scale='min(512,iw)':min'(512,ih)':force_original_aspect_ratio=decrease,fps=15,pad=512:512:-1:-1:color=white@0.0,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[b][p]paletteuse",
                            "-loop 0",
                            "-t 18",
                            "-an",
                            "-vsync 0"
                        ])
                        .toFormat("webp")
                        .save(tmpOut)
                        .on("end", resolve)
                        .on("error", reject);

                });

                const animated =
                    await fs.promises.readFile(tmpOut);

                const finalSticker =
                    await addExif(
                        animated,
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

            // ─────────────────────────────
            // VIDEO/GIF CON FORMA
            // → PRIMER FRAME
            // ─────────────────────────────

            let frame = img;

            if (/video|gif/i.test(mime)) {

                tmpIn = path.join(
                    tmpdir(),
                    `${Date.now()}_${crypto.randomBytes(4).toString("hex")}.mp4`
                );

                tmpFrame = path.join(
                    tmpdir(),
                    `${Date.now()}_${crypto.randomBytes(4).toString("hex")}.png`
                );

                await fs.promises.writeFile(
                    tmpIn,
                    img
                );

                await new Promise((resolve, reject) => {

                    ffmpeg(tmpIn)
                        .inputOptions(["-y"])
                        .outputOptions([
                            "-frames:v 1",
                            "-vf",
                            "scale=500:500:force_original_aspect_ratio=decrease,pad=500:500:(ow-iw)/2:(oh-ih)/2:color=white@0.0"
                        ])
                        .toFormat("png")
                        .save(tmpFrame)
                        .on("end", resolve)
                        .on("error", reject);

                });

                frame =
                    await fs.promises.readFile(
                        tmpFrame
                    );
            }

            // ─────────────────────────────
            // FORMA / TRANSFORMACIÓN
            // ─────────────────────────────

            if (selectedShape) {

                // Flip horizontal
                if (
                    selectedShape ===
                    "flip-horizontal"
                ) {

                    tmpIn = path.join(
                        tmpdir(),
                        `${Date.now()}_${crypto.randomBytes(4).toString("hex")}_flip.png`
                    );

                    tmpOut = path.join(
                        tmpdir(),
                        `${Date.now()}_${crypto.randomBytes(4).toString("hex")}_flip.webp`
                    );

                    await fs.promises.writeFile(
                        tmpIn,
                        frame
                    );

                    await new Promise((resolve, reject) => {

                        ffmpeg(tmpIn)
                            .inputOptions(["-y"])
                            .outputOptions([
                                "-vf",
                                "hflip,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0.0",
                                "-vcodec libwebp",
                                "-pix_fmt yuva420p"
                            ])
                            .toFormat("webp")
                            .save(tmpOut)
                            .on("end", resolve)
                            .on("error", reject);

                    });

                }

                // Flip vertical
                else if (
                    selectedShape ===
                    "flip-vertical"
                ) {

                    tmpIn = path.join(
                        tmpdir(),
                        `${Date.now()}_${crypto.randomBytes(4).toString("hex")}_flip.png`
                    );

                    tmpOut = path.join(
                        tmpdir(),
                        `${Date.now()}_${crypto.randomBytes(4).toString("hex")}_flip.webp`
                    );

                    await fs.promises.writeFile(
                        tmpIn,
                        frame
                    );

                    await new Promise((resolve, reject) => {

                        ffmpeg(tmpIn)
                            .inputOptions(["-y"])
                            .outputOptions([
                                "-vf",
                                "vflip,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0.0",
                                "-vcodec libwebp",
                                "-pix_fmt yuva420p"
                            ])
                            .toFormat("webp")
                            .save(tmpOut)
                            .on("end", resolve)
                            .on("error", reject);

                    });

                }

                // Forma
                else {

                    tmpIn = path.join(
                        tmpdir(),
                        `${Date.now()}_${crypto.randomBytes(4).toString("hex")}_shape.png`
                    );

                    tmpMask = path.join(
                        tmpdir(),
                        `${Date.now()}_${crypto.randomBytes(4).toString("hex")}_mask.png`
                    );

                    tmpOut = path.join(
                        tmpdir(),
                        `${Date.now()}_${crypto.randomBytes(4).toString("hex")}_shape.webp`
                    );

                    await fs.promises.writeFile(
                        tmpIn,
                        frame
                    );

                    const svg =
                        getSVGMask(
                            selectedShape,
                            500
                        );

                    await fs.promises.writeFile(
                        tmpMask,
                        Buffer.from(svg)
                    );

                    // Primero preparar la imagen
                    await new Promise((resolve, reject) => {

                        ffmpeg(tmpIn)
                            .inputOptions(["-y"])
                            .outputOptions([
                                "-vf",
                                "scale=500:500:force_original_aspect_ratio=decrease,pad=500:500:(ow-iw)/2:(oh-ih)/2:color=white@0.0",
                                "-frames:v 1"
                            ])
                            .toFormat("png")
                            .save(tmpIn + "_prepared.png")
                            .on("end", resolve)
                            .on("error", reject);

                    });

                    const prepared =
                        tmpIn + "_prepared.png";

                    // Aplicar máscara
                    await new Promise((resolve, reject) => {

                        ffmpeg()
                            .input(prepared)
                            .input(tmpMask)
                            .complexFilter([
                                "[0:v]format=rgba[img]",
                                "[1:v]format=gray[mask]",
                                "[img][mask]alphamerge"
                            ])
                            .outputOptions([
                                "-frames:v 1",
                                "-pix_fmt rgba"
                            ])
                            .toFormat("png")
                            .save(tmpOut + ".png")
                            .on("end", resolve)
                            .on("error", reject);

                    });

                    const masked =
                        tmpOut + ".png";

                    // Convertir a WebP
                    await new Promise((resolve, reject) => {

                        ffmpeg(masked)
                            .inputOptions(["-y"])
                            .outputOptions([
                                "-vcodec libwebp",
                                "-lossless 0",
                                "-compression_level 6",
                                "-q:v 80",
                                "-pix_fmt yuva420p"
                            ])
                            .toFormat("webp")
                            .save(tmpOut)
                            .on("end", resolve)
                            .on("error", reject);

                    });

                    // Limpieza intermedia
                    for (const file of [
                        prepared,
                        masked
                    ]) {
                        if (fs.existsSync(file)) {
                            try {
                                fs.unlinkSync(file);
                            } catch {}
                        }
                    }
                }

            } else {

                // ─────────────────────────
                // STICKER NORMAL
                // ─────────────────────────

                tmpIn = path.join(
                    tmpdir(),
                    `${Date.now()}_${crypto.randomBytes(4).toString("hex")}.jpg`
                );

                tmpOut = path.join(
                    tmpdir(),
                    `${Date.now()}_${crypto.randomBytes(4).toString("hex")}.webp`
                );

                await fs.promises.writeFile(
                    tmpIn,
                    frame
                );

                await new Promise((resolve, reject) => {

                    ffmpeg(tmpIn)
                        .inputOptions(["-y"])
                        .outputOptions([
                            "-vcodec libwebp",
                            "-vf",
                            "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,pad=320:320:-1:-1:color=white@0.0,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[b][p]paletteuse"
                        ])
                        .toFormat("webp")
                        .save(tmpOut)
                        .on("end", resolve)
                        .on("error", reject);

                });
            }

            // ─────────────────────────────
            // EXIF FINAL
            // ─────────────────────────────

            const webpBuffer =
                await fs.promises.readFile(
                    tmpOut
                );

            const finalSticker =
                await addExif(
                    webpBuffer,
                    f,
                    g
                );

            await fs.promises.writeFile(
                tmpFinal,
                finalSticker
            );

            // ─────────────────────────────
            // ENVIAR
            // ─────────────────────────────

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

            console.error(
                "❌ Error en /s:",
                err
            );

            return m.reply(
                m.e.error +
                " *Error creando el sticker.*"
            );

        } finally {

            // ─────────────────────────────
            // LIMPIAR TEMPORALES
            // ─────────────────────────────

            const files = [
                tmpIn,
                tmpOut,
                tmpFinal,
                tmpFrame,
                tmpMask
            ];

            for (const file of files) {

                if (
                    file &&
                    fs.existsSync(file)
                ) {

                    try {
                        fs.unlinkSync(file);
                    } catch {}
                }
            }
        }
    }
};


// ═══════════════════════════════════════
// MÁSCARAS SVG
// ═══════════════════════════════════════

function getSVGMask(shape, size) {

    const half = size / 2;
    const quarter = size / 4;
    const threeQuarter = 3 * quarter;
    const radius = size * 0.15;

    switch (shape) {

        case "circle":
            return `
<svg width="${size}" height="${size}">
    <circle
        cx="${half}"
        cy="${half}"
        r="${half}"
        fill="white"/>
</svg>`;

        case "triangle":
            return `
<svg width="${size}" height="${size}">
    <polygon
        points="${half},0 ${size},${size} 0,${size}"
        fill="white"/>
</svg>`;

        case "diamond":
            return `
<svg width="${size}" height="${size}">
    <polygon
        points="${half},0 ${size},${half} ${half},${size} 0,${half}"
        fill="white"/>
</svg>`;

        case "hexagon":
            return `
<svg width="${size}" height="${size}">
    <polygon
        points="${half},0 ${size},${quarter} ${size},${threeQuarter} ${half},${size} 0,${threeQuarter} 0,${quarter}"
        fill="white"/>
</svg>`;

        case "pentagon":
            return `
<svg width="${size}" height="${size}">
    <polygon
        points="${half},0 ${size},${quarter} ${3 * quarter},${size} ${quarter},${size} 0,${quarter}"
        fill="white"/>
</svg>`;

        case "heart":
            return `
<svg width="${size}" height="${size}" viewBox="0 0 32 29.6">
    <path
        d="M23.6,0c-2.7,0-5.1,1.3-6.6,3.3C15.5,1.3,13.1,0,10.4,0C4.7,0,0,4.7,0,10.4c0,6,6.2,10.9,15.7,18.5L16,29.6l0.3-0.3C25.8,21.3,32,16.4,32,10.4C32,4.7,27.3,0,21.6,0H23.6z"
        fill="white"/>
</svg>`;

        case "blob":
            return `
<svg width="${size}" height="${size}">
    <path
        d="M150 0 C250 50,250 150,150 200 C50 250,0 150,50 50 Z"
        fill="white"
        transform="scale(${size / 300})"/>
</svg>`;

        case "leaf":
            return `
<svg width="${size}" height="${size}">
    <path
        d="M${half},0 C${size},${quarter},${quarter},${size} 0,${size} C0,${half} 0,${quarter} ${half},0 Z"
        fill="white"/>
</svg>`;

        case "moon":
            return `
<svg width="${size}" height="${size}">
    <path
        d="M${half},0 A${half},${half} 0 1,0 ${half},${size} A${size * 0.6},${half} 0 1,1 ${half},0 Z"
        fill="white"/>
</svg>`;

        case "star":
            return `
<svg width="${size}" height="${size}">
    <polygon
        points="${half},0 ${half + 15},${half - 10} ${size},${half} ${half + 15},${half + 10} ${half},${size} ${half - 15},${half + 10} 0,${half} ${half - 15},${half - 10}"
        fill="white"/>
</svg>`;

        case "zap":
            return `
<svg width="${size}" height="${size}">
    <polygon
        points="${half - 20},${half} ${half + 10},${half} ${half - 10},${size} ${half + 30},${half} ${half},${half} ${half + 10},0"
        fill="white"/>
</svg>`;

        case "curve":
            return `
<svg width="${size}" height="${size}">
    <path
        d="M0,${size} Q${half},0 ${size},${size} Z"
        fill="white"/>
</svg>`;

        case "edges":
            return `
<svg width="${size}" height="${size}">
    <rect
        width="${size}"
        height="${size}"
        rx="${radius}"
        ry="${radius}"
        fill="white"/>
</svg>`;

        case "mirror":
            return `
<svg width="${size}" height="${size}">
    <rect
        width="${half}"
        height="${size}"
        x="0"
        fill="white"/>
</svg>`;

        case "arrow":
            return `
<svg width="${size}" height="${size}">
    <polygon
        points="0,${half - 50} ${half},${half - 50} ${half},0 ${size},${half} ${half},${size} ${half},${half + 50} 0,${half + 50}"
        fill="white"/>
</svg>`;

        case "attach":
        case "expand":
            return `
<svg width="${size}" height="${size}">
    <rect
        width="${size}"
        height="${size}"
        fill="white"/>
</svg>`;

        default:
            throw new Error(
                `Forma no soportada: ${shape}`
            );
    }
}
