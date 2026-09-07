import { db } from "../lib/db.js";
export default {
    name: ["setwarn"],
    help: "setwarn <numero>",
    desc: "Configurar el límite de advertencias antes de expulsar.",
    tags: ["group"],
    group: true,
    admin: true,
    run: async ({ m, args }) => {
        const limit = parseInt(args[0]);
        if (!limit || limit < 1) {
            return m.reply(`⚠️ Usa:\n.setwarn 4`);
        }
        await db.query(`
ALTER TABLE chats
ADD COLUMN IF NOT EXISTS warn_limit INTEGER DEFAULT 3
`);
        await db.query(`
UPDATE chats
SET warn_limit = $1
WHERE group_id = $2
`, [limit, m.chat]);
        m.reply(`⚠️ Límite de advertencias configurado en *${limit}*`);
    }
};
