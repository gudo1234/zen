export default {
    name: ["rw-personajes", "ranking"],
    help: ["rw-personajes"],
    desc: "Muestra el ranking de usuarios con más personajes reclamados",
    tags: ["gacha"],
    register: true,
    run: async ({ conn, m }) => {
        if (!m.db)
            return;
        try {
            const { rows } = await m.db.query("SELECT claimed_by FROM characters");
            const characters = rows;
            if (!characters.length) {
                return m.reply("⚠️ No hay personajes registrados.");
            }
            const claimed = characters.filter(r => !!r.claimed_by);
            const free = characters.filter(r => !r.claimed_by);
            const counter = {};
            for (const c of claimed) {
                const jid = c.claimed_by;
                if (!jid)
                    continue;
                counter[jid] = (counter[jid] || 0) + 1;
            }
            const topUsers = Object.entries(counter)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);
            if (!topUsers.length) {
                return m.reply("⚠️ Nadie ha reclamado personajes todavía.");
            }
            let text = `📊 *\`Ranking de Personajes\`*\n\n` +
                `• Total personajes: ${characters.length}\n` +
                `• Reclamados: ${claimed.length}\n` +
                `• Libres: ${free.length}\n\n` +
                `🏆 *Top usuarios:*\n`;
            const mentions = [];
            topUsers.forEach(([user, count], i) => {
                mentions.push(user);
                text +=
                    `${i + 1}. @${user.split("@")[0]} — *${count}*\n`;
            });
            text +=
                `\n> _Sigue reclamando personajes para subir en el ranking_`;
            return conn.sendMessage(m.chat, {
                text,
                mentions
            }, {
                quoted: m
            });
        }
        catch (err) {
            console.error("rw-personajes error:", err);
            return m.reply(`⚠️ Error al generar el ranking.\n${err?.message || err}`);
        }
    }
};
