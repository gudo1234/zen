import fetch from "node-fetch";
import FormData from "form-data";
async function uploadToCdn(buffer, filename = "nano-banana.png") {
    const form = new FormData();
    form.append("file", buffer, filename);
    const res = await fetch(`https://api.mitzuki.xyz/cdn/upload?apikey=${process.env.API_KEY}&expire=1h`, {
        method: "POST",
        body: form,
        headers: form.getHeaders()
    });
    const raw = await res.text();
    const json = JSON.parse(raw);
    if (!json?.status || !json?.data?.url) {
        throw new Error(json?.error || "CDN no devolvió URL");
    }
    return json.data.url;
}
export default {
    name: ["iaedit", "nanobanana"],
    tags: ["ai"],
    help: ["iaedit <prompt>"],
    desc: "Edita una imagen con IA usando Nano Banana",
    register: true,
    run: async ({ conn, m, text, prefijo, cmd }) => {
        try {
            const q = m.quoted ? m.quoted : m;
            const mime = (q.msg || q).mimetype || q.mediaType || "";
            if (!/image|webp/.test(mime))
                return m.reply(`🍌 *NANO BANANA AI*\n\nResponde a una imagen con:\n\n*${prefijo + cmd} textos*\n\nEjemplo:\n*${prefijo + cmd} Edit this image and put the name 'Mitzuki api'*`);
            if (!text)
                return m.reply(`⚠️ Falta el prompt.\n\nEjemplo:\n*${prefijo + cmd} Edit this image and put the name 'Mitzuki api'*`);
            await m.react?.("🕒");
            const media = await q.download?.();
            if (!media) {
                throw new Error("No pude descargar la imagen");
            }
            const imageUrl = await uploadToCdn(media, "nano-banana.png");
            const api = `https://api.mitzuki.xyz/ai/nano-banana?url=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(text.trim())}&apikey=${process.env.API_KEY}`;
            const res = await fetch(api);
            const raw = await res.text();
            let json;
            try {
                json = JSON.parse(raw);
            }
            catch {
                throw new Error("La API no devolvió JSON válido");
            }
            if (!json?.status || !json?.data?.url) {
                throw new Error(json?.message || json?.error || "La API no devolvió imagen");
            }
            await conn.sendMessage(m.chat, { image: { url: json.data.url }, caption: `✅ Imagen editada correctamente.` }, { quoted: m });
            await m.react?.("✅");
        }
        catch (e) {
            console.error("❌ Error nano-banana:", e);
            await m.react?.("❌");
            await m.reply("❌ Error editando la imagen con Nano Banana.");
        }
    }
};
