import fetch from "node-fetch";
export default {
    name: ["threadsstalk", "tstalk"],
    help: ["threadsstalk <usuario>"],
    desc: "Busca información de un usuario de Threads.",
    tags: ["buscadores"],
    register: true,
    limit: 1,
    run: async ({ conn, m, text, args, prefijo, cmd }) => {
        if (!text)
            return m.reply(`${m.e.warn} *Ingresa el nombre de usuario de Threads.*\n\n📌 Ejemplo:\n${prefijo + cmd} blackpinkinpr`);
        await m.react("⌛");
        try {
            const apiUrl = `https://api.delirius.store/tools/threadsststalk?username=${encodeURIComponent(text)}`;
            const response = await fetch(apiUrl);
            const data = await response.json();
            if (!data?.status || !data.data)
                throw new Error("No se encontraron resultados para ese usuario.");
            const user = data.data;
            const caption = `👤 *Perfil de Threads*

• *Nombre:* ${user.name}
• *Usuario:* ${user.username}
• *Verificado:* ${user.is_verified ? "✅ Sí" : "❌ No"}
• *Seguidores:* ${user.followers}
• *Biografía:* ${user.bio || "Sin descripción"}

🌐 *Links:*
${user.links?.length ? user.links.join("\n") : "Sin enlaces"}

🔗 *Perfil:*
https://www.threads.net/@${user.username}
`.trim();
            await conn.sendFile(m.chat, user.profile_picture, "threads.jpg", caption, m);
            await m.react("✅");
            m.success = true;
        }
        catch (err) {
            console.error("❌ Error en threadsstalk:", err);
            await m.react("❌");
            await m.reply(`${m.e.error + m.msg.error}\n\n >>> ${err} <<<< `);
        }
    }
};
