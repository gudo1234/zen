import fetch from "node-fetch";
const DEFAULT_AVATAR = "https://p16-sign-va.tiktokcdn.com/musically-maliva-obj/1594805258217477~c5_720x720.jpeg";
const formatNumber = (value) => Number(value || 0).toLocaleString();
export default {
    name: ["tiktokstalk", "ttstalk"],
    help: ["tiktokstalk <usuario>"],
    desc: "Obtiene la información del perfil de un usuario de TikTok.",
    tags: ["buscadores"],
    register: true,
    limit: 1,
    run: async ({ conn, m, text, args, prefijo, cmd }) => {
        if (!text) {
            return m.reply(`${m.e?.warn || "⚠️"} *Ingresa el username de TikTok.*\n` +
                `Ejemplo: ${prefijo + cmd} elrebelde21`);
        }
        await m.react?.("⌛");
        const username = String(args?.[0] || text)
            .trim()
            .replace(/^@/, "");
        if (!username) {
            return m.reply("⚠️ Username inválido.");
        }
        try {
            const apiKey = process.env.API_KEY || "";
            if (!apiKey) {
                throw new Error("Falta process.env.API_KEY");
            }
            const res = await fetch(`https://api.mitzuki.xyz/tools/tiktok-stalk?username=${encodeURIComponent(username)}` +
                `&apikey=${encodeURIComponent(apiKey)}`);
            const data = await res.json();
            if (!data?.data) {
                throw new Error(data?.message || data?.error || "Respuesta inválida de Mitzuki");
            }
            const p = data.data;
            const caption = `👤 *Perfil de TikTok*\n\n` +
                `• *Username:* ${username}\n` +
                `• *Nickname:* ${p.nickname || "-"}\n` +
                `• *Verificado:* ${p.verified ? "✅ Sí" : "❌ No"}\n\n` +
                `• *Seguidores:* ${formatNumber(p.stats?.followers)}\n` +
                `• *Seguidos:* ${formatNumber(p.stats?.following)}\n` +
                `• *Likes Totales:* ${formatNumber(p.stats?.likes)}\n` +
                `• *Videos:* ${formatNumber(p.stats?.videos)}\n` +
                `• *Bio:* ${p.bio || "Sin descripción"}\n` +
                `• *URL:* https://tiktok.com/@${username}`;
            const avatar = p.avatar || DEFAULT_AVATAR;
            await conn.sendFile(m.chat, avatar, "tt.png", caption, m);
            await m.react?.("✅");
            m.success = true;
            return;
        }
        catch (err1) {
            console.warn("⚠️ Mitzuki falló, usando Delirius:", err1?.message || err1);
            try {
                const response = await fetch(`https://api.delirius.store/tools/tiktokstalk?q=${encodeURIComponent(username)}`);
                const data = await response.json();
                if (!data?.result?.users) {
                    throw new Error("Delirius sin datos");
                }
                const profile = data.result.users;
                const stats = data.result.stats || {};
                const caption = `👤 *Perfil de TikTok*\n\n` +
                    `• *Nombre de usuario:* ${profile.username || username}\n` +
                    `• *Nickname:* ${profile.nickname || "-"}\n` +
                    `• *Verificado:* ${profile.verified ? "✅ Sí" : "❌ No"}\n\n` +
                    `• *Seguidores:* ${formatNumber(stats.followerCount)}\n` +
                    `• *Seguidos:* ${formatNumber(stats.followingCount)}\n` +
                    `• *Likes Totales:* ${formatNumber(stats.heartCount)}\n` +
                    `• *Videos:* ${formatNumber(stats.videoCount)}\n` +
                    `• *Firma:* ${profile.signature || "Sin descripción"}\n` +
                    `• *URL:* ${profile.url || `https://tiktok.com/@${username}`}`;
                await conn.sendFile(m.chat, profile.avatarLarger || DEFAULT_AVATAR, "tt.png", caption, m);
                await m.react?.("✅");
                m.success = true;
            }
            catch (err2) {
                console.error("❌ TikTokStalk falló total:", err2);
                await m.react?.("❌");
                await m.reply(`❌ No se pudo obtener información del perfil.\n${err2?.message || err2}`);
            }
        }
    }
};
