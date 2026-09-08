export default {
    name: ["ver"],
    help: ["ver", "readviewonce", "read", "readvo", "rvo"],
    desc: "Revela mensajes ViewOnce",
    tags: ["herramientas"],
    group: false,
    botAdmin: false,
    register: false,

    run: async ({ conn, m, body }) => {
        try {
            if (!m.quoted) {
                return m.reply(
                    `Responde a una imagen, video o audio ViewOnce.`
                );
            }

            if (!m.quoted.viewOnce) {
                return m.reply(
                    `Responde a una imagen, video o audio ViewOnce.`
                );
            }

            await m.react("🕒");

            const buffer = await m.quoted.download(false);

            if (!buffer) {
                return m.reply(
                    `No pude descargar el mensaje ViewOnce.`
                );
            }

            // ==========================================
            // VIDEO
            // ==========================================

            if (/videoMessage/i.test(m.quoted.mtype)) {
                return conn.sendFile(
                    m.chat,
                    buffer,
                    "media.mp4",
                    m.quoted.caption || "",
                    m
                );
            }

            // ==========================================
            // IMAGEN
            // ==========================================

            if (/imageMessage/i.test(m.quoted.mtype)) {
                return conn.sendFile(
                    m.chat,
                    buffer,
                    "media.jpg",
                    m.quoted.caption || "",
                    m
                );
            }

            // ==========================================
            // AUDIO
            // ==========================================

            if (/audioMessage/i.test(m.quoted.mtype)) {
                return conn.sendFile(
                    m.chat,
                    buffer,
                    "audio.mp3",
                    "",
                    m,
                    true,
                    {
                        type: "audioMessage",
                        ptt: true
                    }
                );
            }

            return m.reply(
                `Ese tipo de ViewOnce no es compatible.`
            );

        } catch (e) {
            console.error(
                "❌ Error en ver:",
                e
            );

            return m.reply(
                `Ocurrió un error al intentar revelar el ViewOnce.`
            );
        }
    }
};
