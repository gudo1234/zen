import fetch from "node-fetch";
export default {
    name: ["igstalk", "igsearch", "instagramsearch"],
    help: ["igstalk <usuario>"],
    desc: "Obtiene la información del perfil de un usuario de Instagram.",
    tags: ["buscadores"],
    register: true,
    limit: 1,
    run: async ({ conn, m, text, args, prefijo, cmd }) => {
        if (!text)
            return m.reply(`${m.e.warn} *Ingresa el nombre de usuario de Instagram.*\n\n📌 Ejemplo:\n${prefijo + cmd} chinita.ofi`);
        const username = args[0].replace(/^@/, "");
        await m.react(m.e.load);
        try {
            const res = await fetch(`https://api.mitzuki.xyz/tools/instagram-stalk?username=${encodeURIComponent(username)}&apikey=${process.env.API_KEY}`);
            const data = await res.json();
            if (!data?.data)
                throw new Error("Respuesta inválida de Mitzuki");
            const p = data.data;
            const caption = `👤 *Perfil de Instagram*\n
🔹 *Usuario:* ${p.username}
🔹 *Nombre completo:* ${p.full_name || "-"}
🔹 *Biografía:* ${p.bio || "Sin descripción"}
🔹 *Verificado:* ${p.verified ? "✅ Sí" : "❌ No"}
🔹 *Privado:* ${p.private ? "🔒 Sí" : "🌍 No"}
🔹 *Seguidores:* ${Number(p.followers || 0).toLocaleString()}
🔹 *Seguidos:* ${Number(p.following || 0).toLocaleString()}
🔹 *Publicaciones:* ${Number(p.posts || 0)}
🔹 *URL:* https://instagram.com/${p.username}`;
            await conn.sendFile(m.chat, p.profile_pic, "igstalk.png", caption, m);
            await m.react(m.e.ok);
        }
        catch (err1) {
            console.warn("⚠️ Mitzuki falló, usando Delirius…");
            try {
                const gptDel = await fetch(`https://api.delirius.store/tools/igstalk?username=${encodeURIComponent(username)}`);
                const dataDel = await gptDel.json();
                if (!dataDel?.data)
                    throw new Error("Delirius sin datos");
                const p = dataDel.data;
                const caption = `👤 *Perfil de Instagram*\n
🔹 *Usuario:* ${p.username}
🔹 *Nombre completo:* ${p.full_name || "-"}
🔹 *Biografía:* ${p.biography || "Sin descripción"}
🔹 *Verificado:* ${p.verified ? "✅ Sí" : "❌ No"}
🔹 *Privado:* ${p.private ? "🔒 Sí" : "🌍 No"}
🔹 *Seguidores:* ${Number(p.followers || 0).toLocaleString()}
🔹 *Seguidos:* ${Number(p.following || 0).toLocaleString()}
🔹 *Publicaciones:* ${Number(p.posts || 0)}
🔹 *URL:* https://instagram.com/${p.username}`;
                await conn.sendFile(m.chat, p.profile_picture, "igstalk.png", caption, m);
                await m.react(m.e.ok);
                m.success = true;
            }
            catch (err2) {
                console.error("❌ InstagramStalk falló:", err2);
                await m.react(m.e.error);
                await m.reply("❌ No pude obtener información del perfil.");
            }
        }
    }
};
