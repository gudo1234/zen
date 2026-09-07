import fetch from "node-fetch";
export default {
    name: ["fb", "facebook", "fbdl"],
    help: ["fb <url>"],
    desc: "Descarga videos de Facebook.",
    tags: ["downloader"],
    register: true,
    limitPrem: true,
    limit: 1,
    run: async ({ conn, m, args, prefijo, cmd }) => {
        if (!args[0])
            return m.reply(`${m.e.warn} Usa:\n${prefijo + cmd} <enlace de Facebook>\n\n📌 Ejemplo:\n${prefijo + cmd} https://www.facebook.com/watch?v=12345`);
        const url = args[0];
        await m.react("⏳");
        try {
            let downloadUrl = null;
            try {
                const res = await fetch(`https://api-sky.ultraplus.click/api/download/facebook.js?url=${encodeURIComponent(url)}`, { headers: { Authorization: "Bearer pxFkVcczMsSe" } });
                if (res.ok) {
                    const json = await res.json();
                    downloadUrl = json?.data?.video_hd || json?.data?.video_sd;
                    if (downloadUrl)
                        console.log("✅ SkyUltraPlus OK");
                }
            }
            catch (err) {
                console.log("⚠️ Error SkyUltraPlus:", err);
            }
            if (!downloadUrl) {
                try {
                    console.log("⚠️ Sky falló, probando Mitzuki...");
                    const res2 = await fetch(`https://api.mitzuki.xyz/download/facebook?url=${encodeURIComponent(url)}&apikey=${process.env.API_KEY}`);
                    const data = await res2.json();
                    downloadUrl = data?.data?.media?.sd || data?.data?.media?.hd;
                    if (downloadUrl)
                        console.log("✅ Mitzuki OK");
                }
                catch (err) {
                    console.log("⚠️ Error Mitzuki:", err);
                }
            }
            if (!downloadUrl) {
                try {
                    const res3 = await fetch(`https://api.delirius.store/download/facebook?url=${encodeURIComponent(url)}`);
                    const delius = await res3.json();
                    downloadUrl = delius?.urls?.[0]?.hd || delius?.urls?.[0]?.sd;
                    if (downloadUrl)
                        console.log("✅ Delirius OK");
                }
                catch (err) {
                    console.log("⚠️ Error Delirius:", err);
                }
            }
            if (!downloadUrl) {
                try {
                    console.log("⚠️ Delirius falló, probando Dorratz...");
                    const res4 = await fetch(`https://api.dorratz.com/fbvideo?url=${encodeURIComponent(url)}`);
                    const data = await res4.json();
                    downloadUrl = data?.result?.hd || data?.result?.sd;
                    if (downloadUrl)
                        console.log("✅ Dorratz OK");
                }
                catch (err) {
                    console.log("⚠️ Error Dorratz:", err);
                }
            }
            if (!downloadUrl)
                return m.reply(m.e.error + " No se pudo obtener el video. Verifica el enlace o prueba otro.");
            await conn.sendMessage(m.chat, { video: { url: downloadUrl }, caption: "✅ Aquí está tu video de Facebook\n> Power by: api.mitzuki.xyz" }, { quoted: m });
            await m.react("✅");
            m.success = true;
        }
        catch (err) {
            console.error("❌ Error en /fb:", err);
            //await m.reply(`${m.e.error + m.msg.error}\n\n >>> ${err} <<<< `);
            await m.react("❌");
        }
    },
};
