import { db } from "../lib/db.js";
export default {
    name: ["sethorario"],
    help: ["sethorario"],
    desc: "Establece el horario para comandos NSFW en el grupo",
    tags: ["group"],
    admin: true,
    group: true,
    register: false,
    run: async ({ conn, m, args, prefijo }) => {
        try {
            const rango = (args[0] || '').trim();
            // Validar formato HH:MM-HH:MM
            if (!/^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(rango)) {
                return m.reply(`⚠️ Formato incorrecto.\n\n📌 Ejemplo: ${prefijo}sethorario 23:00-06:00`);
            }
            // Guardar en la base de datos
            await db.query(`INSERT INTO chats (group_id) VALUES ($1) ON CONFLICT (group_id) DO NOTHING`, [m.chat]);
            await db.query(`UPDATE chats SET nsfw_horario = $1 WHERE group_id = $2`, [rango, m.chat]);
            m.react("⏰");
            return m.reply(`✅ Horario NSFW establecido a *${rango}*`);
        }
        catch (error) {
            console.error('[SET HORARIO ERROR]', error);
            m.react("❌");
            return m.reply(`❌ Error al establecer horario.\n\n${error.message || error}`);
        }
    }
};
