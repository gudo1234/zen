import fetch from "node-fetch";
export default {
    name: ["xstalk", "twitterstalk", "xuser"],
    help: ["xstalk <usuario>"],
    desc: "Obtiene información de un usuario de X (Twitter).",
    tags: ["buscadores"],
    register: true,
    run: async ({ conn, m, text, args, prefijo, cmd }) => {
        if (!text)
            return m.reply(`${m.e.warn} *Ingresa el nombre de usuario de X (Twitter).* \n\n📌 Ejemplo:\n${prefijo + cmd} jennierubyjane`);
        await m.react("⌛");
        try {
            const apiUrl = `https://api.delirius.store/tools/xstalk?username=${encodeURIComponent(text)}`;
            const response = await fetch(apiUrl);
            const json = await response.json();
            if (!json?.status || !json.data)
                throw new Error("No se encontraron resultados para ese usuario.");
            const user = json.data;
            const caption = `🐦 *Perfil de X (Twitter)*

• *Nombre:* ${user.name}
• *Usuario:* @${user.username}
• *Verificado:* ${user.verified ? "✅ Sí" : "❌ No"}
• *Seguidores:* ${user.followers_count?.toLocaleString() || 0}
• *Siguiendo:* ${user.following_count?.toLocaleString() || 0}
• *Tweets:* ${user.statuses_count || 0}
• *Likes:* ${user.favourites_count || 0}
• *Privado:* ${user.is_private ? "🔒 Sí" : "🔓 No"}
• *Fecha de creación:* ${user.created || "Desconocida"}
• *Biografía:* ${user.description || "Sin descripción"}

🌐 *Perfil:*  
${user.url || "No disponible"}
`.trim();
            if (user.banner)
                await conn.sendMessage(m.chat, { image: { url: user.banner }, caption }, { quoted: m });
            else
                await conn.sendFile(m.chat, user.avatar || "", "xuser.jpg", caption, m);
            await m.react("✅");
        }
        catch (err) {
            console.error("❌ Error en xstalk:", err);
            await m.react("❌");
            await m.reply(`${m.e.error + m.msg.error}\n\n >>> ${err} <<<< `);
        }
    }
};
