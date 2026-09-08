import sharp from "sharp";
import {
    S_WHATSAPP_NET,
    downloadContentFromMessage
} from "@whiskeysockets/baileys";

export default {
    name: ["icongp", "setppgroup", "setppgp"],

    help: ["icongp"],

    desc: "Cambia la foto de perfil del grupo",

    tags: ["grupo"],

    group: true,

    admin: true,

    botAdmin: true,

    register: false,

    run: async ({ conn, m }) => {
        try {
            const groupId = m.chat;

            // ==========================================
            // DETECTAR IMAGEN
            // ==========================================

            let q = null;

            if (m.quoted) {
                q = m.quoted;
            } else if (m.message?.imageMessage) {
                q = m;
            } else {
                const quoted =
                    m.message?.extendedTextMessage
                        ?.contextInfo
                        ?.quotedMessage;

                if (quoted?.imageMessage) {
                    q = {
                        message: quoted,
                        msg: quoted.imageMessage,
                        mimetype: quoted.imageMessage.mimetype
                    };
                }
            }

            if (!q) {
                return m.reply(
                    `${m.e?.warn || "⚠️"} Responde a una imagen o envía una imagen junto al comando.`
                );
            }

            // ==========================================
            // VALIDAR MIME
            // ==========================================

            const mimetype =
                q.mimetype ||
                q.msg?.mimetype ||
                q.message?.imageMessage?.mimetype ||
                "";

            if (!mimetype.includes("image")) {
                return m.reply(
                    `${m.e?.warn || "⚠️"} El mensaje respondido no es una imagen.`
                );
            }

            // ==========================================
            // DESCARGAR IMAGEN
            // ==========================================

            let mediaBuffer = null;

            if (typeof q.download === "function") {
                try {
                    mediaBuffer = await q.download();
                } catch {}
            }

            // Respaldo para mensajes citados
            if (!mediaBuffer) {
                try {
                    const imageMessage =
                        q.msg ||
                        q.message?.imageMessage ||
                        q.message;

                    const stream = await downloadContentFromMessage(
                        imageMessage,
                        "image"
                    );

                    const chunks = [];

                    for await (const chunk of stream) {
                        chunks.push(chunk);
                    }

                    mediaBuffer = Buffer.concat(chunks);
                } catch (err) {
                    console.error(
                        "[ICONGP] Error descargando:",
                        err?.message || err
                    );
                }
            }

            if (!mediaBuffer?.length) {
                return m.reply(
                    `${m.e?.warn || "⚠️"} No pude descargar la imagen.`
                );
            }

            // ==========================================
            // PROCESAR IMAGEN
            // ==========================================

            const metadata = await sharp(mediaBuffer).metadata();

            const width = metadata.width || 720;
            const height = metadata.height || 720;

            const processed = await sharp(mediaBuffer)
    .resize(720, 720, {
        fit: "contain",
        background: {
            r: 0,
            g: 0,
            b: 0,
            alpha: 0
        }
    })
    .jpeg({
        quality: 95,
        mozjpeg: true
    })
    .toBuffer();

            // ==========================================
            // ACTUALIZAR FOTO DEL GRUPO
            // ==========================================

            await conn.query({
                tag: "iq",

                attrs: {
                    to: S_WHATSAPP_NET,
                    target: groupId,
                    type: "set",
                    xmlns: "w:profile:picture"
                },

                content: [
                    {
                        tag: "picture",

                        attrs: {
                            type: "image"
                        },

                        content: processed
                    }
                ]
            });

            // ==========================================
            // RESPUESTA
            // ==========================================

            await m.reply(
                "✅ *Foto del grupo actualizada correctamente.*"
            );

            await m.react("✅");

        } catch (err) {
            console.error(
                "[ICONGP ERROR]",
                err
            );

            await m.react("❌").catch(() => {});

            return m.reply(
                `❌ *Error al cambiar la foto del grupo.*\n\n> ${err?.message || "Error desconocido"}`
            );
        }
    }
};
