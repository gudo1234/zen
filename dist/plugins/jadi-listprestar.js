import { db, getPrefix } from "../lib/db.js";
export default {
    name: ["listprestar", "lstprestar", "prestarlist", "listaprestar"],
    help: ["listprestar"],
    tags: ["jadibot"],
    desc: "Muestra la lista de bots que prestar sus bots",
    register: true,
    run: async ({ conn, m, args }) => {
        const botId = conn.user?.id?.split(":")[0] || "mainbot";
        const { rows } = await db.query(`SELECT bot_id, name_bot, tipo, mode, registro 
       FROM bot_settings 
       WHERE prestar = true
       AND mode NOT IN ('private', 'self')
       ORDER BY bot_id ASC`);
        if (rows.length === 0)
            return m.reply(`❌ *No hay ningun bot que se presté para grupos*`);
        let texto = `*≡ LISTA DE BOTS QUE PRESTAR*\n\n`;
        texto += `┌○「 📊 RESULTADOS 」\n`;
        texto += `│ Total: *${rows.length} bots*\n`;
        texto += `└○\n\n`;
        for (const [index, bot] of rows.entries()) {
            const botId2 = bot.bot_id;
            const prefijoBot = await getPrefix(botId2);
            const gruposRes = await db.query(`SELECT bot_data 
         FROM chats 
         WHERE is_group = true 
         AND bot_data ? $1`, [botId2]);
            const gruposUnidos = gruposRes.rows.filter(r => {
                const data = r.bot_data || {};
                return data[botId2]?.joined === true;
            }).length;
            const totalGrupos = gruposRes.rows.filter(r => {
                const data = r.bot_data || {};
                return data[botId2] !== undefined;
            }).length;
            const usersRes = await db.query(`SELECT COUNT(*)::int FROM usuarios WHERE registered = true`);
            const totalUsers = usersRes.rows[0]?.count || 0;
            const nombre = bot.name_bot || bot.bot_id;
            const tipo = bot.tipo || 'subbot';
            const modo = bot.mode === 'private' ? 'Private' : 'Públic';
            const registro = bot.registro ? 'Activado' : 'Desactivado';
            texto += `┌• wa.me/${bot.bot_id} (${nombre})\n`;
            texto += `│ Tipo: *${tipo}*\n`;
            texto += `│ Prefix: *${prefijoBot}*\n`;
            texto += `│ Modo: ${modo}\n`;
            texto += `│ Registro: ${registro}\n`;
            texto += `│ Grupos: *${gruposUnidos}*\n`;
            texto += `└○\n\n`;
        }
        texto += `\n> *PUEDE UNIRLO A TU GRUPO CON:*\n> /join link tiempo\n`;
        await m.reply(texto);
    }
};
