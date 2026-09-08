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
            if (!m.quoted) {
                return conn.sendMessage(
                    m.chat,
                    { text: "⚠️ Responde a una imagen, video o audio ViewOnce." },
                    { quoted: m }
                );
            }

            const { downloadContentFromMessage } =
                await import("@whiskeysockets/baileys");

            const quoted = m.quoted;
            const msg = quoted.message || quoted.msg || quoted;

            let viewOnce = msg?.viewOnceMessage;
            let viewOnceV2 = msg?.viewOnceMessageV2;
            let viewOnceV2Ext = msg?.viewOnceMessageV2Extension;

            const container = viewOnce || viewOnceV2 || viewOnceV2Ext;

            if (!container?.message) {
                return conn.sendMessage(
                    m.chat,
                    { text: "⚠️ El mensaje citado no es un ViewOnce." },
                    { quoted: m }
                );
            }

            const content = container.message;

            let type;
            let media;

            if (content.imageMessage) {
                type = "image";
                media = content.imageMessage;
            } else if (content.videoMessage) {
                type = "video";
                media = content.videoMessage;
            } else if (content.audioMessage) {
                type = "audio";
                media = content.audioMessage;
            }

            if (!media) {
                return conn.sendMessage(
                    m.chat,
                    { text: "❌ Este tipo de ViewOnce no es compatible." },
                    { quoted: m }
                );
            }

            await m.react("🕒");

            const stream = await downloadContentFromMessage(media, type);

            const chunks = [];

            for await (const chunk of stream) {
                chunks.push(chunk);
            }

            const buffer = Buffer.concat(chunks);

            if (!buffer.length) {
                return conn.sendMessage(
                    m.chat,
                    { text: "❌ No se pudo descargar el ViewOnce." },
                    { quoted: m }
                );
            }

            const caption = media.caption || "";

            if (type === "image") {
                return conn.sendMessage(
                    m.chat,
                    {
                        image: buffer,
                        caption
                    },
                    { quoted: m }
                );
            }

            if (type === "video") {
                return conn.sendMessage(
                    m.chat,
                    {
                        video: buffer,
                        caption
                    },
                    { quoted: m }
                );
            }

            if (type === "audio") {
                return conn.sendMessage(
                    m.chat,
                    {
                        audio: buffer,
                        mimetype: media.mimetype || "audio/mpeg",
                        ptt: media.ptt || false
                    },
                    { quoted: m }
                );
            }

        } catch (e) {
            console.error("❌ Error en ver:", e);

            return conn.sendMessage(
                m.chat,
                { text: "❌ Ocurrió un error al revelar el ViewOnce." },
                { quoted: m }
            );
        }
    }
};
