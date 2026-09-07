import fetch from "node-fetch";
export default {
    name: ["ig", "instagram", "igdl"],
    help: ["ig <url>"],
    desc: "Descarga videos o imágenes de Instagram.",
    tags: ["downloader"],
    register: true,
    limitPrem: true,
    limit: 1,
    run: async ({ conn, m, args, prefijo, cmd }) => {
        if (!args[0])
            return m.reply(`${m.e.warn} Usa:\n${prefijo + cmd} <enlace de Instagram>\n\n📌 Ejemplo:\n${prefijo + cmd} https://www.instagram.com/reel/xxxxxxxxx`);
        const url = args[0];
        await m.react("⏳");
        let downloadUrl = null;
        let fileType = "video";
        let caption = "";
        try {
            const res = await fetch(`https://api-sky.ultraplus.click/api/download/instagram.js?url=${encodeURIComponent(url)}`, { headers: { Authorization: "Bearer pxFkVcczMsSe" } });
            if (res.ok) {
                const json = (await res.json());
                downloadUrl = json?.result?.url || null;
                fileType = json?.result?.type || "video";
                caption = fileType === "image" ? "_*Aquí tienes tu imagen de Instagram*_" : "*Aquí está tu video de Instagram*";
            }
            if (!downloadUrl) {
                console.log("⚠️ SkyUltraPlus falló, intentando con Delirius...");
                const apiUrl = `https://api.delirius.store/download/instagram?url=${encodeURIComponent(url)}`;
                const apiResponse = await fetch(apiUrl);
                const delius = (await apiResponse.json());
                if (delius?.data && delius.data.length > 0) {
                    downloadUrl = delius.data[0].url;
                    fileType = delius.data[0].type;
                    caption = fileType === "image" ? "_*Aquí tienes tu imagen de Instagram*_" : "*Aquí está tu video de Instagram*";
                }
            }
            if (!downloadUrl) {
                console.log("⚠️ Delirius falló, intentando con Mitzuki...");
                const res2 = await fetch(`https://api.mitzuki.xyz/download/instagram?url=${encodeURIComponent(url)}&apikey=${process.env.API_KEY}`);
                const data = await res2.json();
                if (data?.data?.media && data.data.media.length > 0) {
                    downloadUrl = data.data.media[0].dl_download;
                    fileType = data.data[0].type === "image" ? "image" : "video";
                    caption = fileType === "image" ? "_*Aquí tienes tu imagen de Instagram*_\n> Power by: api.mitzuki.xyz" : "*Aquí está tu video de Instagram*\n> Power by: api.mitzuki.xyz";
                }
            }
            if (!downloadUrl) {
                console.log("⚠️ Delirius falló, intentando con Siputzx...");
                const res3 = await fetch(`https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(url)}`);
                const data = (await res3.json());
                if (data?.data && data.data.length > 0) {
                    downloadUrl = data.data[0].url;
                    fileType = data.data[0].url.includes(".webp") ? "image" : "video";
                    caption = fileType === "image" ? "_*Aquí tienes tu imagen de Instagram*_" : "*Aquí está tu video de Instagram*";
                }
            }
            if (!downloadUrl)
                return m.reply(m.e.error + " No se pudo obtener el contenido. Verifica el enlace o prueba otro.");
            await conn.sendMessage(m.chat, fileType === "image" ? { image: { url: downloadUrl }, caption } : { video: { url: downloadUrl }, caption }, { quoted: m });
            await m.react("✅");
            m.success = true;
        }
        catch (err) {
            console.error("❌ Error en /ig:", err);
            //await m.reply(`${m.e.warn + m.msg.error}\n\n >>> ${err} <<<< `);
            await m.react("❌");
        }
    },
};
