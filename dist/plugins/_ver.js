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
                    {
                        text: "⚠️ Responde a una imagen, video o audio ViewOnce."
                    },
                    { quoted: m }
                );
            }

            const {
                downloadContentFromMessage
            } = await import("@whiskeysockets/baileys");

            // Igual que en tu plugin de stickers
            const q = m.quoted ? m.quoted : m;
            const msg = q.msg || q;

            // Buscar ViewOnce en todas las estructuras posibles
            const viewOnce =
                msg?.viewOnceMessage ||
                msg?.viewOnceMessageV2 ||
                msg?.viewOnceMessageV2Extension ||
                msg?.message?.viewOnceMessage ||
                msg?.message?.viewOnceMessageV2 ||
                msg?.message?.viewOnceMessageV2Extension;

            if (!viewOnce?.message) {
                return conn.sendMessage(
                    m.chat,
                    {
                        text: "⚠️ El mensaje citado no es un ViewOnce."
                    },
                    { quoted: m }
                );
            }

            const content = viewOnce.message;

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
                    {
                        text: "❌ Este tipo de ViewOnce no es compatible."
                    },
                    { quoted: m }
                );
            }

            await m.react("🕒");

            const stream = await downloadContentFromMessage(
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
                        text: "❌ No se pudo descargar el ViewOnce."
                    },
                    { quoted: m }
                );
            }

            const caption = media.caption || "";

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
                        mimetype: media.mimetype || "audio/mpeg",
                        ptt: media.ptt || false
                    },
                    { quoted: m }
                );
            }

            await m.react("✅");

        } catch (e) {
            console.error("❌ Error en ver:", e);

            try {
                await m.react("❌");
            } catch {}

            return conn.sendMessage(
                m.chat,
                {
                    text: "❌ Ocurrió un error al revelar el ViewOnce."
                },
                { quoted: m }
            );
        }
    }
};
