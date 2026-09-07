import fetch from "node-fetch";
export default {
    name: ["robloxstalk", "rbstalk", "roblox"],
    help: ["robloxstalk <usuario>"],
    desc: "Busca información de un usuario de Roblox.",
    tags: ["buscadores"],
    register: true,
    limit: 1,
    run: async ({ conn, m, text, args, prefijo, cmd }) => {
        if (!text)
            return m.reply(`${m.e.warn} *Ingresa el nombre de usuario de Roblox.*\n\n📌 Ejemplo:\n${prefijo + cmd} elrebelde21`);
        await m.react("⌛");
        try {
            const apiUrl = `https://api.delirius.store/tools/robloxstalk?username=${encodeURIComponent(text)}&type=name`;
            const response = await fetch(apiUrl);
            const json = await response.json();
            if (!json?.status || !json.data)
                throw new Error("No se encontraron resultados para ese usuario.");
            const user = json.data;
            let caption = `🎮 *Perfil de Roblox*

• *Nombre:* ${user.name}
• *Usuario:* ${user.username}
• *ID:* ${user.id}
• *Estado de cuenta:* ${user.extraInfo?.accountStatus || "Desconocido"}
• *Verificado:* ${user.hasVerified ? "✅ Sí" : "❌ No"}
• *Suspendido:* ${user.isBanned ? "🚫 Sí" : "🟢 No"}
• *País:* ${user.extraInfo?.country || "Desconocido"}
• *Amigos:* ${user.friends}
• *Seguidores:* ${user.followers}
• *Siguiendo:* ${user.followings}
• *Creado:* ${user.created}
• *Descripción:* ${user.description || "Sin descripción"}
`.trim();
            caption += `\n\n🌐 *Perfil:*\n${user.url}\n`;
            if (user.groups?.length) {
                const topGroups = user.groups.slice(0, 5);
                caption += `\n🏷️ *Grupos recientes:*\n`;
                topGroups.forEach((g, i) => {
                    caption += `\n${i + 1}. *${g.groupName}*\n   ↳ Rol: ${g.role}\n   👥 ${g.memberCount} miembros`;
                });
            }
            if (user.gamesCreated?.length) {
                const game = user.gamesCreated[0];
                caption += `\n\n🕹️ *Juego creado:*\n• *${game.name}*\n   🎮 Jugando: ${game.playing}\n   📅 ${game.created}`;
            }
            await conn.sendFile(m.chat, user.profile_image, "roblox.jpg", caption, m);
            await m.react("✅");
            m.success = true;
        }
        catch (err) {
            console.error("❌ Error en robloxstalk:", err);
            await m.react("❌");
            await m.reply(`${m.e.error + m.msg.error}\n\n >>> ${err} <<<< `);
        }
    }
};
