import fetch from "node-fetch";

const APIKEY = "oboe";

export default {
    name: ["tk", "tt", "ttv", "tiktok", "tkmp4", "ttvid", "tiktokvid"],

    help: [
        "tiktok <texto>",
        "tiktok <url>"
    ],

    desc: "Busca y descarga videos de TikTok.",

    tags: [
        "downloader"
    ],

    group: true,
    botAdmin: false,
    register: false,
    limitPrem: true,

    run: async ({ conn, m, args, prefijo, cmd }) => {

        const input = args?.join(" ").trim() || "";

        if (!input) {
            return m.reply(
                `${m.e?.warn || "⚠️"} *¿Qué TikTok quieres descargar?*\n\n` +
                `Ejemplo:\n${prefijo + cmd} Diles\n` +
                `${prefijo + cmd} https://www.tiktok.com/@vitotvo.ec/video/7677072456238058759`
            );
        }

        await m.react?.("⌛");

        try {

            const isTikTok =
                /^(https?:\/\/)?((www|vm|vt|m|t)\.)?tiktok\.com\/\S+/i.test(input);

            let videoUrl = null;
            let result = null;

            // ━━━━━━━━━━━━━━━━━━━━━━━
            // 🔗 DESCARGA POR ENLACE
            // ━━━━━━━━━━━━━━━━━━━━━━━
            if (isTikTok) {

                const apiKey = process.env.API_KEY || "";

                const res = await fetch(
                    `https://api.mitzuki.xyz/download/tiktok?url=${encodeURIComponent(input)}` +
                    `&apikey=${encodeURIComponent(apiKey)}`
                );

                const data = await res.json();

                videoUrl =
                    data?.data?.media?.video || null;

            }

            // ━━━━━━━━━━━━━━━━━━━━━━━
            // 🔎 BÚSQUEDA POR TEXTO
            // ━━━━━━━━━━━━━━━━━━━━━━━
            else {

                const res = await fetch(
                    `https://api.alyacore.xyz/search/tiktok?query=${encodeURIComponent(input)}` +
                    `&key=${encodeURIComponent(APIKEY)}`
                );

                const data = await res.json();

                if (
                    !data?.status ||
                    !Array.isArray(data.data) ||
                    !data.data.length
                ) {
                    throw new Error("No se encontraron resultados.");
                }

                result = data.data.find(x => x?.dl);

                if (!result) {
                    throw new Error(
                        "El resultado no contiene enlace de descarga."
                    );
                }

                videoUrl = result.dl;
            }

            if (!videoUrl) {
                await m.react?.("❌");
                return m.reply(
                    "❌ No se pudo obtener el video de TikTok."
                );
            }

            // ━━━━━━━━━━━━━━━━━━━━━━━
            // 🎥 ENVIAR VIDEO
            // ━━━━━━━━━━━━━━━━━━━━━━━
            let caption =
                "*🔰 Aquí está tu video de TikTok*";

            if (result) {

                const author = result.author || {};
                const stats = result.stats || {};

                const formatter = n => {
                    n = Number(n) || 0;

                    if (n >= 1e9)
                        return (n / 1e9).toFixed(1) + "B";

                    if (n >= 1e6)
                        return (n / 1e6).toFixed(1) + "M";

                    if (n >= 1e3)
                        return (n / 1e3).toFixed(1) + "K";

                    return String(n);
                };

                caption =
                    `${result.title || "Sin título"}\n\n` +
                    `> Autor › ${author.nickname || author.unique_id || "Desconocido"}\n` +
                    `> Duración › ${result.duration || "-"}\n` +
                    `> Región › ${result.region || "-"}\n` +
                    `> Vistas › ${formatter(stats.views)}\n` +
                    `> Likes › ${formatter(stats.likes)}\n` +
                    `> Url › ${result.url || "-"}`;
            }

            await conn.sendMessage(
                m.chat,
                {
                    video: {
                        url: videoUrl
                    },
                    caption,
                    mimetype: "video/mp4",
                    fileName: "tiktok.mp4"
                },
                {
                    quoted: m
                }
            );

            await m.react?.("✅");

        } catch (e) {

            console.error(
                "❌ TIKTOK:",
                e
            );

            await m.react?.("❌");

            await m.reply(
                `❌ No pude procesar el TikTok.\n\n> ${e?.message || e}`
            );
        }
    }
};
