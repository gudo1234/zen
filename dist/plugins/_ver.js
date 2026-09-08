export default {
    name: ["ver"],
    help: ["ver", "readviewonce", "read", "readvo", "rvo"],
    desc: "Revela mensajes ViewOnce",
    tags: ["herramientas"],
    group: false,
    botAdmin: false,
    register: false,

    run: async ({ conn, m }) => {
        try {
            if (!m.quoted || !m.quoted.viewOnce) {
                return conn.sendMessage(
                    m.chat,
                    { text: "⚠️ Responde a una imagen, video o audio ViewOnce." },
                    { quoted: m }
                );
            }

            await m.react("🕒");

            const buffer = await m.quoted.download(false);

            if (!buffer) {
                return conn.sendMessage(
                    m.chat,
                    { text: "❌ No pude descargar el mensaje ViewOnce." },
                    { quoted: m }
                );
            }

            if (/videoMessage/i.test(m.quoted.mtype)) {
                return conn.sendMessage(
                    m.chat,
                    {
                        video: buffer,
                        caption: m.quoted.caption || ""
                    },
                    { quoted: m }
                );
            }

            if (/imageMessage/i.test(m.quoted.mtype)) {
                return conn.sendMessage(
                    m.chat,
                    {
                        image: buffer,
                        caption: m.quoted.caption || ""
                    },
                    { quoted: m }
                );
            }

            if (/audioMessage/i.test(m.quoted.mtype)) {
                return conn.sendMessage(
                    m.chat,
                    {
                        audio: buffer,
                        mimetype: "audio/mpeg",
                        ptt: true
                    },
                    { quoted: m }
                );
            }

            return conn.sendMessage(
                m.chat,
                { text: "❌ Ese tipo de ViewOnce no es compatible." },
                { quoted: m }
            );

        } catch (e) {
            console.error("❌ Error en ver:", e);

            return conn.sendMessage(
                m.chat,
                { text: "❌ Ocurrió un error al intentar revelar el ViewOnce." },
                { quoted: m }
            );
        }
    }
};
