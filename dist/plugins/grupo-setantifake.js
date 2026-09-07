import { db } from "../lib/db.js";
export default {
    name: ["setnum", "setmsgfake", "delfake"],
    help: [
        "setnum <prefijos>",
        "setmsgfake <texto>",
        "delfake <prefijos>"
    ],
    desc: "Configura, personaliza o elimina prefijos prohibidos del antifake.",
    tags: ["grupo"],
    group: true,
    admin: true,
    register: true,
    run: async ({ m, args, prefijo, cmd }) => {
        const chatId = m.chat;
        const res = await db.query("SELECT antifake_prefixes FROM chats WHERE group_id = $1", [chatId]);
        let current = res.rowCount > 0 ? res.rows[0].antifake_prefixes || [] : [];
        if (cmd === "setnum") {
            if (!args.length)
                return m.reply(`${m.e.warn} Usa:\n${prefijo + cmd} +92 +91 +212\n\nSe añadirán automáticamente los números con esos prefijos.`);
            const prefixes = args.filter(p => /^\+?\d+$/.test(p));
            if (!prefixes.length)
                return m.reply(m.e.error + " No hay prefijos válidos.");
            const newOnes = prefixes.filter(p => !current.includes(p));
            const duplicated = prefixes.filter(p => current.includes(p));
            if (!newOnes.length)
                return m.reply(m.e.warn + " Todos esos prefijos ya estaban en la lista.");
            const updated = [...current, ...newOnes];
            await db.query(`INSERT INTO chats (group_id, antifake_prefixes)
         VALUES ($1, $2)
         ON CONFLICT (group_id) DO UPDATE SET antifake_prefixes = $2`, [chatId, updated]);
            let msg = `✅ Prefijos agregados:\n🚫 ${newOnes.join(", ")}`;
            if (duplicated.length)
                msg += `\n${m.e.warn} Ya estaban en la lista: ${duplicated.join(", ")}`;
            await m.reply(msg);
        }
        if (cmd === "setmsgfake") {
            const text = args.join(" ");
            if (!text)
                return m.reply(`${m.e.warn} Usa:\n${prefijo + cmd}  🚫 Número prohibido detectado: @user fue eliminado del grupo.`);
            await db.query(`INSERT INTO chats (group_id, sAntifakeMsg)
         VALUES ($1, $2)
         ON CONFLICT (group_id) DO UPDATE SET sAntifakeMsg = $2`, [chatId, text.trim()]);
            await m.reply(`✅ Mensaje antifake actualizado:\n\n📜 ${text}`);
        }
        if (cmd === "delfake") {
            if (!args.length)
                return m.reply(`${m.e.warn} Usa:\n${prefijo + cmd} +92 +91\n\nEliminará esos prefijos de la lista actual.`);
            const toDelete = args.filter(p => /^\+?\d+$/.test(p));
            const notFound = toDelete.filter(p => !current.includes(p));
            const remaining = current.filter(p => !toDelete.includes(p));
            await db.query(`INSERT INTO chats (group_id, antifake_prefixes)
         VALUES ($1, $2)
         ON CONFLICT (group_id) DO UPDATE SET antifake_prefixes = $2`, [chatId, remaining]);
            let msg = `🗑️ Prefijos eliminados correctamente:\n❌ ${toDelete.join(", ")}`;
            if (notFound.length)
                msg += `\n${m.e.warn} No estaban en la lista: ${notFound.join(", ")}`;
            await m.reply(msg);
        }
    }
};
