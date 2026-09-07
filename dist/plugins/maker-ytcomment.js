import fetch from "node-fetch";
import FormData from "form-data";
const DEFAULT_AVATAR = "https://api.mitzuki.xyz/cdn/upload/file/c0fc30665fb7623f49b6";
export default {
    name: ["ytcomment", "youtubecomment"],
    tags: ["maker"],
    help: ["ytcomment <usuario>|<comentario>"],
    desc: "Genera comentario falso de YouTube",
    register: true,
    run: async ({ conn, m, text, prefijo }) => {
        if (!text)
            return m.reply(`📺 *YT COMMENT MAKER*\n\nUso:\n*${prefijo}ytcomment usuario|comentario*\n\nEjemplo:\n*${prefijo}ytcomment Mitzuki|best api*`);
        try {
            let [username, comment] = text.split("|");
            username = username?.trim();
            comment = comment?.trim();
            if (!username || !comment) {
                return m.reply(`⚠️ Formato incorrecto.\n\nUsa:\n*${prefijo}ytcomment usuario|comentario*`);
            }
            await m.react?.("🕒");
            let avatar = DEFAULT_AVATAR;
            try {
                const pp = await conn.profilePictureUrl(m.sender, "image").catch(() => null);
                if (pp && /^https?:\/\//i.test(pp)) {
                    const imgRes = await fetch(pp);
                    if (imgRes.ok) {
                        const buffer = Buffer.from(await imgRes.arrayBuffer());
                        const form = new FormData();
                        form.append("file", buffer, {
                            filename: "avatar.jpg",
                            contentType: "image/jpeg"
                        });
                        const upload = await fetch(`https://api.mitzuki.xyz/cdn/upload?apikey=${process.env.API_KEY}&expire=1h`, {
                            method: "POST",
                            body: form,
                            headers: form.getHeaders()
                        });
                        const uploadJson = await upload.json();
                        if (uploadJson?.status && uploadJson?.data?.url) {
                            avatar = uploadJson.data.url;
                        }
                    }
                }
            }
            catch (e) {
                console.log("[YTCOMMENT] avatar fallback:", e?.message || e);
            }
            const api = `https://api.mitzuki.xyz/maker/ytcomment?text=${encodeURIComponent(comment)}&avatar=${encodeURIComponent(avatar)}&username=${encodeURIComponent(username)}&apikey=${process.env.API_KEY}`;
            const res = await fetch(api);
            const raw = await res.text();
            const json = JSON.parse(raw);
            if (!json?.status || !json?.data?.url) {
                throw new Error(json?.message || json?.error || "La API no devolvió imagen");
            }
            await conn.sendMessage(m.chat, { image: { url: json.data.url }, caption: `📺 *Comentario generado correctamente*` }, { quoted: m });
            await m.react?.("✅");
        }
        catch (e) {
            console.error("❌ Error ytcomment:", e);
            await m.react?.("❌");
            await m.reply(`❌ Error generando comentario.\n${e?.message || e}`);
        }
    }
};
