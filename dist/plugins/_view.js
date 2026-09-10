export default {
    name: ["ver", "readviewonce", "read", "readvo", "rvo"],
    help: ["ver"],
    desc: "Revela mensajes ViewOnce automáticamente",
    tags: ["tools"],
    group: false,
    botAdmin: false,
    register: false,

    // GRUPO DONDE SE ENVIARÁ AUTOMÁTICAMENTE LA VIEWONCE
    targetGroup: "120363407073055516@g.us",

    /*
     * =========================================================
     * DETECCIÓN AUTOMÁTICA
     * =========================================================
     *
     * NO necesita .s
     * NO necesita .ver
     * NO necesita ningún comando.
     *
     * Si el usuario responde directamente a una ViewOnce
     * con cualquier cosa, se intenta revelar.
     */
    before: async (m, { conn }) => {
        if (!m?.quoted) return;

        try {
            const result = await revealViewOnce({
                conn,
                m,
                destination: "120363407073055516@g.us",
                automatic: true
            });

            return result;
        } catch (e) {
            console.error(
                "❌ Error automático ViewOnce:",
                e
            );
        }
    },

    /*
     * =========================================================
     * COMANDO MANUAL
     * =========================================================
     *
     * También puedes seguir usando:
     *
     * .ver
     * .read
     * .rvo
     *
     * respondiendo a una ViewOnce.
     */
    run: async ({ conn, m }) => {
        return revealViewOnce({
            conn,
            m,
            destination: m.chat,
            automatic: false
        });
    }
};


/*
 * =============================================================
 * FUNCIÓN PRINCIPAL
 * =============================================================
 */
async function revealViewOnce({
    conn,
    m,
    destination,
    automatic = false
}) {
    try {

        if (!m?.quoted) {
            if (!automatic) {
                return conn.sendMessage(
                    m.chat,
                    {
                        text:
                            "⚠️ Responde directamente a una imagen, video o audio ViewOnce."
                    },
                    { quoted: m }
                );
            }

            return false;
        }


        /*
         * ---------------------------------------------------------
         * IMPORTAR BAILEYS
         * ---------------------------------------------------------
         */
        const {
            downloadContentFromMessage,
            normalizeMessageContent
        } = await import("@whiskeysockets/baileys");


        const q = m.quoted;


        /*
         * ---------------------------------------------------------
         * OBTENER POSIBLES ESTRUCTURAS DEL MENSAJE CITADO
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


        /*
         * Algunos serializers utilizan getMessage()
         */
        try {
            if (typeof q.getMessage === "function") {
                const result = await q.getMessage();

                addCandidate(result);
                addCandidate(result?.message);
            }
        } catch {}


        /*
         * ---------------------------------------------------------
         * CLAVES DE VIEWONCE
         * ---------------------------------------------------------
         */
        const VIEW_ONCE_KEYS = new Set([
            "viewOnceMessage",
            "viewOnceMessageV2",
            "viewOnceMessageV2Extension"
        ]);


        /*
         * TIPOS DE MEDIA
         */
        const MEDIA_KEYS = new Set([
            "imageMessage",
            "videoMessage",
            "audioMessage",
            "documentMessage"
        ]);


        /*
         * ---------------------------------------------------------
         * BUSCADOR RECURSIVO
         * ---------------------------------------------------------
         */
        function findViewOnce(obj, depth = 0, insideViewOnce = false) {

            if (
                !obj ||
                typeof obj !== "object"
            ) {
                return null;
            }


            if (depth > 15) {
                return null;
            }


            /*
             * Si encontramos un wrapper ViewOnce,
             * entramos a su contenido.
             */
            for (const key of VIEW_ONCE_KEYS) {

                if (
                    obj[key] &&
                    typeof obj[key] === "object"
                ) {

                    const wrapper = obj[key];

                    /*
                     * Formato:
                     * viewOnceMessage: {
                     *     message: {...}
                     * }
                     */
                    if (wrapper.message) {

                        const result = findViewOnce(
                            wrapper.message,
                            depth + 1,
                            true
                        );

                        if (result) {
                            return result;
                        }
                    }
                }
            }


            /*
             * Si ya estamos dentro de un ViewOnce,
             * buscamos la imagen/video/audio/documento.
             */
            if (insideViewOnce) {

                for (const key of MEDIA_KEYS) {

                    if (obj[key]) {

                        return {
                            type: key.replace(
                                "Message",
                                ""
                            ),
                            media: obj[key]
                        };
                    }
                }
            }


            /*
             * Buscar recursivamente dentro de todas
             * las propiedades.
             */
            for (const key of Object.keys(obj)) {

                try {

                    const value = obj[key];

                    if (
                        !value ||
                        typeof value !== "object"
                    ) {
                        continue;
                    }


                    const result = findViewOnce(
                        value,
                        depth + 1,
                        insideViewOnce
                    );


                    if (result) {
                        return result;
                    }

                } catch {}
            }


            return null;
        }


        /*
         * ---------------------------------------------------------
         * BUSCAR VIEWONCE
         * ---------------------------------------------------------
         */
        let found = null;


        /*
         * Primero intentamos normalizar cada estructura
         * utilizando Baileys.
         */
        for (const candidate of candidates) {

            try {

                const normalized =
                    normalizeMessageContent(
                        candidate
                    );


                if (!normalized) {
                    continue;
                }


                found = findViewOnce(
                    normalized
                );


                if (found) {
                    break;
                }

            } catch {}
        }


        /*
         * Si no funcionó la normalización,
         * buscamos directamente.
         */
        if (!found) {

            for (const candidate of candidates) {

                try {

                    found = findViewOnce(
                        candidate
                    );


                    if (found) {
                        break;
                    }

                } catch {}
            }
        }


        /*
         * ---------------------------------------------------------
         * SI NO SE DETECTÓ VIEWONCE
         * ---------------------------------------------------------
         */
        if (!found) {

            console.log(
                "⚠️ VER: El mensaje citado no contiene una ViewOnce.",
                {
                    chat: m.chat,
                    automatic,
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


            /*
             * En modo automático NO mandamos mensajes
             * de error al grupo.
             */
            if (automatic) {
                return false;
            }


            return conn.sendMessage(
                m.chat,
                {
                    text:
                        "⚠️ No pude detectar una imagen, video, audio o documento ViewOnce.\n\n" +
                        "Asegúrate de responder directamente al mensaje ViewOnce."
                },
                { quoted: m }
            );
        }


        /*
         * ---------------------------------------------------------
         * TIPO Y MEDIA
         * ---------------------------------------------------------
         */
        const type = found.type;
        const media = found.media;


        if (!media) {
            return false;
        }


        console.log(
            `👁️ ViewOnce detectado: ${type}`
        );


        /*
         * REACCIÓN
         */
        try {
            await m.react("🕒");
        } catch {}


        /*
         * ---------------------------------------------------------
         * DESCARGAR
         * ---------------------------------------------------------
         */
        let stream;

        try {

            stream =
                await downloadContentFromMessage(
                    media,
                    type
                );

        } catch (downloadError) {

            console.error(
                "❌ Error descargando ViewOnce:",
                downloadError
            );


            /*
             * Intentar con q.download()
             */
            if (
                typeof q.download === "function"
            ) {

                try {

                    const buffer =
                        await q.download();


                    if (
                        buffer &&
                        buffer.length
                    ) {

                        return await sendMedia(
                            conn,
                            destination,
                            buffer,
                            media,
                            type,
                            m
                        );
                    }

                } catch (fallbackError) {

                    console.error(
                        "❌ q.download() también falló:",
                        fallbackError
                    );
                }
            }


            if (!automatic) {

                return conn.sendMessage(
                    m.chat,
                    {
                        text:
                            "❌ No se pudo descargar el contenido del ViewOnce."
                    },
                    { quoted: m }
                );
            }


            return false;
        }


        /*
         * ---------------------------------------------------------
         * CONVERTIR STREAM A BUFFER
         * ---------------------------------------------------------
         */
        const chunks = [];


        for await (const chunk of stream) {
            chunks.push(chunk);
        }


        const buffer =
            Buffer.concat(chunks);


        if (
            !buffer ||
            !buffer.length
        ) {

            if (!automatic) {

                return conn.sendMessage(
                    m.chat,
                    {
                        text:
                            "❌ El ViewOnce no pudo ser descargado."
                    },
                    { quoted: m }
                );
            }


            return false;
        }


        /*
         * ---------------------------------------------------------
         * ENVIAR AL GRUPO
         * ---------------------------------------------------------
         */
        await sendMedia(
            conn,
            destination,
            buffer,
            media,
            type,
            m
        );


        /*
         * REACCIÓN CORRECTA
         */
        try {
            await m.react("✅");
        } catch {}


        console.log(
            `✅ ViewOnce enviada automáticamente a ${destination}`
        );


        return true;


    } catch (e) {

        console.error(
            "❌ Error completo en ViewOnce:",
            e
        );


        try {
            await m.react("❌");
        } catch {}


        /*
         * En automático no mandamos el error
         * al grupo para no llenar el chat.
         */
        if (automatic) {
            return false;
        }


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


/*
 * =============================================================
 * ENVIAR MEDIA
 * =============================================================
 */
async function sendMedia(
    conn,
    destination,
    buffer,
    media,
    type,
    m
) {

    const caption =
        media?.caption || "";


    /*
     * IMAGEN
     */
    if (type === "image") {

        await conn.sendMessage(
            destination,
            {
                image: buffer,
                caption
            },
            { quoted: m }
        );

        return true;
    }


    /*
     * VIDEO
     */
    if (type === "video") {

        await conn.sendMessage(
            destination,
            {
                video: buffer,
                caption
            },
            { quoted: m }
        );

        return true;
    }


    /*
     * AUDIO
     */
    if (type === "audio") {

        await conn.sendMessage(
            destination,
            {
                audio: buffer,
                mimetype:
                    media?.mimetype ||
                    "audio/mpeg",
                ptt:
                    media?.ptt ||
                    false
            },
            { quoted: m }
        );

        return true;
    }


    /*
     * DOCUMENTO
     */
    if (type === "document") {

        await conn.sendMessage(
            destination,
            {
                document: buffer,
                mimetype:
                    media?.mimetype ||
                    "application/octet-stream",
                fileName:
                    media?.fileName ||
                    "archivo"
            },
            { quoted: m }
        );

        return true;
    }


    return false;
}
