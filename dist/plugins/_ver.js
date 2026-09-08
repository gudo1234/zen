export default {
    name:  ["ver", "readviewonce", "read", "readvo", "rvo"],
    help: ["ver"],
    desc: "Revela mensajes ViewOnce",
    tags: ["tools"],
    group: false,
    botAdmin: false,
    register: false,

    run: async ({ conn, m }) => {
        try {
            if (!m.quoted) {
                return conn.sendMessage(
                    m.chat,
                    {
                        text: "⚠️ Responde directamente a una imagen, video o audio ViewOnce."
                    },
                    { quoted: m }
                );
            }

            const {
                downloadContentFromMessage,
                normalizeMessageContent
            } = await import("@whiskeysockets/baileys");

            const q = m.quoted;

            /*
             * ---------------------------------------------------------
             * 1. OBTENER TODAS LAS POSIBLES ESTRUCTURAS DEL CITADO
             * ---------------------------------------------------------
             */

            const candidates = [];

            const addCandidate = value => {
                if (!value) return;

                if (
                    typeof value === "object" &&
                    !candidates.includes(value)
                ) {
                    candidates.push(value);
                }
            };

            addCandidate(q);
            addCandidate(q.msg);
            addCandidate(q.message);
            addCandidate(q.msg?.message);

            // Algunos serializers tienen getMessage()
            try {
                if (typeof q.getMessage === "function") {
                    const result = await q.getMessage();
                    addCandidate(result);
                    addCandidate(result?.message);
                }
            } catch {}

            /*
             * ---------------------------------------------------------
             * 2. BUSCADOR RECURSIVO DE VIEWONCE
             * ---------------------------------------------------------
             *
             * Busca aunque el mensaje venga dentro de:
             *
             * viewOnceMessage
             * viewOnceMessageV2
             * viewOnceMessageV2Extension
             * ephemeralMessage
             * documentWithCaptionMessage
             * etc.
             */

            const VIEW_ONCE_KEYS = new Set([
                "viewOnceMessage",
                "viewOnceMessageV2",
                "viewOnceMessageV2Extension"
            ]);

            const MEDIA_KEYS = new Set([
                "imageMessage",
                "videoMessage",
                "audioMessage",
                "documentMessage"
            ]);

            const visited = new Set();

            function findViewOnce(obj, depth = 0) {
                if (!obj || typeof obj !== "object") {
                    return null;
                }

                if (depth > 12) {
                    return null;
                }

                if (visited.has(obj)) {
                    return null;
                }

                visited.add(obj);

                /*
                 * Si el propio objeto es un ViewOnce
                 */
                for (const key of VIEW_ONCE_KEYS) {
                    if (obj[key]?.message) {
                        return obj[key].message;
                    }
                }

                /*
                 * Si ya llegamos directamente al contenido multimedia
                 */
                for (const key of MEDIA_KEYS) {
                    if (obj[key]) {
                        return obj;
                    }
                }

                /*
                 * Buscar dentro de todas las propiedades.
                 */
                for (const key of Object.keys(obj)) {
                    try {
                        const value = obj[key];

                        if (!value || typeof value !== "object") {
                            continue;
                        }

                        const result = findViewOnce(value, depth + 1);

                        if (result) {
                            return result;
                        }
                    } catch {}
                }

                return null;
            }

            let content = null;

            /*
             * ---------------------------------------------------------
             * 3. INTENTAR NORMALIZAR COMO HACE BAILEYS
             * ---------------------------------------------------------
             */

            for (const candidate of candidates) {
                try {
                    const normalized =
                        normalizeMessageContent(candidate);

                    if (normalized) {
                        content = findViewOnce(normalized);

                        if (content) break;
                    }
                } catch {}
            }

            /*
             * ---------------------------------------------------------
             * 4. BUSCAR DIRECTAMENTE EN CADA CANDIDATO
             * ---------------------------------------------------------
             */

            if (!content) {
                for (const candidate of candidates) {
                    content = findViewOnce(candidate);

                    if (content) break;
                }
            }

            /*
             * ---------------------------------------------------------
             * 5. DETERMINAR EL TIPO DE MEDIA
             * ---------------------------------------------------------
             */

            let type = null;
            let media = null;

            if (content?.imageMessage) {
                type = "image";
                media = content.imageMessage;
            }

            else if (content?.videoMessage) {
                type = "video";
                media = content.videoMessage;
            }

            else if (content?.audioMessage) {
                type = "audio";
                media = content.audioMessage;
            }

            else if (content?.documentMessage) {
                type = "document";
                media = content.documentMessage;
            }

            /*
             * ---------------------------------------------------------
             * 6. SI NO ENCONTRAMOS WRAPPER, REVISAR EL CITADO DIRECTO
             * ---------------------------------------------------------
             */

            if (!media) {
                const directCandidates = [
                    q.msg,
                    q.message,
                    q
                ];

                for (const candidate of directCandidates) {
                    if (!candidate) continue;

                    if (candidate.imageMessage) {
                        type = "image";
                        media = candidate.imageMessage;
                        break;
                    }

                    if (candidate.videoMessage) {
                        type = "video";
                        media = candidate.videoMessage;
                        break;
                    }

                    if (candidate.audioMessage) {
                        type = "audio";
                        media = candidate.audioMessage;
                        break;
                    }

                    if (candidate.documentMessage) {
                        type = "document";
                        media = candidate.documentMessage;
                        break;
                    }
                }
            }

            /*
             * ---------------------------------------------------------
             * 7. ÚLTIMO RECURSO:
             *    USAR EL DOWNLOAD() DEL SERIALIZER
             * ---------------------------------------------------------
             *
             * Muchos handlers basados en Yuki/Mystic ya agregan
             * q.download(), y esto evita depender de cómo expongan
             * internamente el ViewOnce.
             */

            if (!media && typeof q.download === "function") {
                try {
                    await m.react("🕒");

                    const buffer = await q.download();

                    if (buffer && buffer.length) {
                        const mime =
                            (q.msg || q).mimetype ||
                            q.mimetype ||
                            "";

                        if (/image/i.test(mime)) {
                            return conn.sendMessage(
                                m.chat,
                                {
                                    image: buffer
                                },
                                { quoted: m }
                            );
                        }

                        if (/video/i.test(mime)) {
                            return conn.sendMessage(
                                m.chat,
                                {
                                    video: buffer
                                },
                                { quoted: m }
                            );
                        }

                        if (/audio/i.test(mime)) {
                            return conn.sendMessage(
                                m.chat,
                                {
                                    audio: buffer,
                                    mimetype: mime || "audio/mpeg",
                                    ptt: (q.msg || q).ptt || false
                                },
                                { quoted: m }
                            );
                        }

                        if (/application|document/i.test(mime)) {
                            return conn.sendMessage(
                                m.chat,
                                {
                                    document: buffer,
                                    mimetype: mime || "application/octet-stream",
                                    fileName:
                                        (q.msg || q).fileName ||
                                        "archivo"
                                },
                                { quoted: m }
                            );
                        }
                    }
                } catch (downloadError) {
                    console.error(
                        "⚠️ Fallback q.download() falló:",
                        downloadError
                    );
                }
            }

            /*
             * ---------------------------------------------------------
             * 8. SI REALMENTE NO SE DETECTÓ
             * ---------------------------------------------------------
             */

            if (!media) {
                console.log(
                    "⚠️ VER: No se detectó ViewOnce.",
                    {
                        hasQuoted: !!m.quoted,
                        quotedKeys: q
                            ? Object.keys(q)
                            : [],
                        msgKeys: q?.msg
                            ? Object.keys(q.msg)
                            : [],
                        messageKeys: q?.message
                            ? Object.keys(q.message)
                            : []
                    }
                );

                return conn.sendMessage(
                    m.chat,
                    {
                        text:
                            "⚠️ No pude detectar el contenido multimedia del mensaje citado.\n\n" +
                            "Asegúrate de responder directamente al ViewOnce."
                    },
                    { quoted: m }
                );
            }

            await m.react("🕒");

            /*
             * ---------------------------------------------------------
             * 9. DESCARGAR MEDIA CON BAILEYS
             * ---------------------------------------------------------
             */

            const stream =
                await downloadContentFromMessage(
                    media,
                    type
                );

            const chunks = [];

            for await (const chunk of stream) {
                chunks.push(chunk);
            }

            const buffer = Buffer.concat(chunks);

            if (!buffer.length) {
                return conn.sendMessage(
                    m.chat,
                    {
                        text: "❌ No se pudo descargar el contenido del ViewOnce."
                    },
                    { quoted: m }
                );
            }

            const caption = media.caption || "";

            /*
             * ---------------------------------------------------------
             * 10. ENVIAR RESULTADO
             * ---------------------------------------------------------
             */

            if (type === "image") {
                await conn.sendMessage(
                    m.chat,
                    {
                        image: buffer,
                        caption
                    },
                    { quoted: m }
                );
            }

            else if (type === "video") {
                await conn.sendMessage(
                    m.chat,
                    {
                        video: buffer,
                        caption
                    },
                    { quoted: m }
                );
            }

            else if (type === "audio") {
                await conn.sendMessage(
                    m.chat,
                    {
                        audio: buffer,
                        mimetype:
                            media.mimetype ||
                            "audio/mpeg",
                        ptt: media.ptt || false
                    },
                    { quoted: m }
                );
            }

            else if (type === "document") {
                await conn.sendMessage(
                    m.chat,
                    {
                        document: buffer,
                        mimetype:
                            media.mimetype ||
                            "application/octet-stream",
                        fileName:
                            media.fileName ||
                            "archivo"
                    },
                    { quoted: m }
                );
            }

            await m.react("✅");

        } catch (e) {
            console.error(
                "❌ Error completo en ver:",
                e
            );

            try {
                await m.react("❌");
            } catch {}

            return conn.sendMessage(
                m.chat,
                {
                    text:
                        "❌ Ocurrió un error al revelar el ViewOnce."
                },
                { quoted: m }
            );
        }
    }
};
