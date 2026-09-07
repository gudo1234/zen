import { db } from "../lib/db.js";
export default {
    name: ["listprem", "listpremium", "premiumlist", "listapremium"],
    help: ["listprem"],
    tags: ["main"],
    desc: "Muestra la lista de usuarios con premium activo",
    owner: true,
    register: true,
    run: async ({ conn, m, args, prefijo }) => {
        try {
            const now = Date.now();
            const { rows } = await db.query(`SELECT id, num, nombre, premium_until 
         FROM usuarios 
         WHERE premium IS TRUE
         AND premium_until > $1
         ORDER BY premium_until ASC`, [now]);
            if (rows.length === 0) {
                return m.reply(`❌ *No hay usuarios con premium activo en este momento.*`);
            }
            let texto = `*≡ LISTA DE PREMIUM*\n\n`;
            texto += `┌─「 📊 RESULTADOS 」─•\n`;
            texto += `│ Total: *${rows.length} usuarios*\n`;
            texto += `└────────────────•\n\n`;
            const mentions = [];
            for (let i = 0; i < rows.length; i++) {
                const user = rows[i];
                const until = Number(user.premium_until);
                const fechaExpiracion = new Date(until).toLocaleString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                const restante = until - now;
                const dias = Math.floor(restante / 86400000);
                const horas = Math.floor((restante % 86400000) / 3600000);
                const minutos = Math.floor((restante % 3600000) / 60000);
                let tiempoRestante = "";
                if (dias > 0)
                    tiempoRestante += `${dias}d `;
                if (horas > 0)
                    tiempoRestante += `${horas}h `;
                if (minutos > 0)
                    tiempoRestante += `${minutos}m`;
                if (!tiempoRestante)
                    tiempoRestante = "Expirando pronto";
                let jid = user.id;
                if (!jid || !jid.includes('@s.whatsapp.net')) {
                    if (user.num) {
                        jid = `${user.num}@s.whatsapp.net`;
                    }
                }
                const nombre = user.nombre || user.num || user.id?.split('@')[0] || "Sin nombre";
                if (jid && jid.includes('@s.whatsapp.net')) {
                    mentions.push(jid);
                    texto += `┌•「 👤 ${i + 1} 」\n`;
                    texto += `│ *Usuario:* @${jid.split('@')[0]}\n`;
                    texto += `│ *Expira:* ${fechaExpiracion}\n`;
                    texto += `│ *Restante:* ⏳ ${tiempoRestante}\n`;
                    texto += `└•\n\n`;
                }
                else {
                    texto += `┌•「 👤 ${i + 1} 」\n`;
                    texto += `│ *Usuario:* ${nombre}\n`;
                    texto += `│ *Expira:* ${fechaExpiracion}\n`;
                    texto += `│ *Restante:* ⏳ ${tiempoRestante}\n`;
                    texto += `└•\n\n`;
                }
            }
            texto += `> 💡 *Comandos:*\n`;
            texto += `├ ${prefijo}addpremium @user <tiempo>\n`;
            texto += `└ ${prefijo}delpremium @user`;
            await conn.sendMessage(m.chat, {
                text: texto,
                mentions: mentions
            }, { quoted: m });
        }
        catch (e) {
            console.error("❌ Error en listprem:", e);
            await m.react("❌");
            await m.reply(`❌ Error: ${e.message}`);
        }
    }
};
