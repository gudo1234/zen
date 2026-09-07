import fetch from "node-fetch";
const userRequests = {};
const userCaptions = new Map();
export default {
    name: ["mediafire", "mediafiredl", "dlmediafire"],
    help: ["mediafire <url>"],
    desc: "Descarga archivos desde enlaces de Mediafire.",
    tags: ["downloader"],
    register: true,
    limitPrem: true,
    limit: 3,
    run: async ({ conn, m, args, prefijo, cmd }) => {
        const stickerError = "https://qu.ax/Wdsb.webp";
        if (!args[0])
            return m.reply(`${m.e.warn} *Ingresa un enlace válido de Mediafire.*\n\n📌 Ejemplo:\n${prefijo + cmd} https://www.mediafire.com/file/sd9hl31vhhzf76v/EvolutionV1.1-beta.apk/file`);
        if (userRequests[m.sender]) {
            await conn.reply(m.chat, `${m.e.warn} Hey @${m.sender.split("@")[0]}, ya estás descargando algo 🙄\nEspera a que termine tu solicitud actual.`, userCaptions.get(m.sender) || m);
            return;
        }
        userRequests[m.sender] = true;
        await m.react("🚀");
        try {
            const apis = [
                async () => {
                    const res = await fetch(`https://api.delirius.store/download/mediafire?url=${args[0]}`);
                    const data = await res.json();
                    return {
                        url: data.data[0].link,
                        filename: data.data[0].filename,
                        filesize: data.data[0].size,
                        mimetype: data.data[0].mime,
                        power: "result por: api.delirius.store"
                    };
                },
                async () => {
                    const res = await fetch(`https://api.mitzuki.xyz/download/mediafire?url=${args[0]}&apikey=${process.env.API_KEY}`);
                    const data = await res.json();
                    if (!data?.data?.files || data.data.files.length === 0)
                        throw new Error("Error en Mitzuki");
                    return {
                        url: data.data.files[0].download,
                        filename: data.data.files[0].name,
                        filesize: data.data.files[0].size,
                        mimetype: "application/octet-stream",
                        power: "power by: api.mitzuki.xyz"
                    };
                },
                async () => {
                    const res = await fetch(`https://api.neoxr.eu/api/mediafire?url=${args[0]}&apikey=russellxz`);
                    const data = await res.json();
                    if (!data.status || !data.data)
                        throw new Error("Error en Neoxr");
                    return {
                        url: data.data.url,
                        filename: data.data.title,
                        filesize: data.data.size,
                        mimetype: data.data.mime,
                        power: "result por: api.neoxr.eu"
                    };
                },
                async () => {
                    const res = await fetch(`https://api.agatz.xyz/api/mediafire?url=${args[0]}`);
                    const data = await res.json();
                    return {
                        url: data.data[0].link,
                        filename: data.data[0].nama,
                        filesize: data.data[0].size,
                        mimetype: data.data[0].mime,
                        power: "result por: api.agatz.xyz"
                    };
                },
                async () => {
                    const res = await fetch(`https://api.siputzx.my.id/api/d/mediafire?url=${args[0]}`);
                    const data = await res.json();
                    return {
                        url: data.data[0].link,
                        filename: data.data[0].filename,
                        filesize: data.data[0].size,
                        mimetype: data.data[0].mime,
                        power: "result por: api.siputzx.my.id"
                    };
                }
            ];
            let file = null;
            for (const attempt of apis) {
                try {
                    file = await attempt();
                    if (file)
                        break;
                }
                catch (err) {
                    console.error(`⚠️ Error en intento Mediafire: ${err.message}`);
                }
            }
            if (!file)
                throw new Error("❌ No se pudo descargar el archivo desde ninguna API.");
            const caption = `┏━━『 𝐌𝐄𝐃𝐈𝐀𝐅𝐈𝐑𝐄 』━━•
┃❥ 𝐍𝐨𝐦𝐛𝐫𝐞 : ${file.filename}
┃❥ 𝐏𝐞𝐬𝐨 : ${file.filesize}
┃❥ 𝐓𝐢𝐩𝐨 : ${file.mimetype}
┃❥ ${file.power}
╰━━━⊰ 𓃠 𝗠𝗶𝗧𝗭𝗨𝗞𝗜 ⊱━━━━•

> ⏳ *Enviando archivo, por favor espera...*
`.trim();
            const captionMsg = await m.reply(caption);
            userCaptions.set(m.sender, captionMsg);
            await conn.sendMessage(m.chat, { document: { url: file.url }, fileName: file.filename, mimetype: file.mimetype, caption: file.filename }, { quoted: m });
            await m.react("✅");
            m.success = true;
        }
        catch (err) {
            console.error("❌ Error Mediafire:", err);
            await m.react("❌");
            await conn.sendFile(m.chat, stickerError, "error.webp", "", m);
            //await m.reply(`${m.e.warn + m.msg.error}\n\n >>> ${err} <<<< `);
        }
        finally {
            delete userRequests[m.sender];
        }
    }
};
