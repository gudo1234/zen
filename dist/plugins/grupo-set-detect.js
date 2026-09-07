import { db } from "../lib/db.js";
export default {
    name: ["setdesc", "setsubject", "setannounce", "setrestrict"],
    help: [
        "setdesc <texto>",
        "setsubject <texto>",
        "setannounce <texto>",
        "setrestrict <texto>"
    ],
    desc: "Personaliza los mensajes automáticos de cambios en el grupo.",
    tags: ["grupo"],
    group: true,
    admin: true,
    register: true,
    run: async ({ m, args, prefijo, cmd }) => {
        const chatId = m.chat;
        const text = args.join(" ");
        if (!text) {
            let ejemplo = "";
            switch (cmd) {
                case "setdesc":
                    ejemplo = prefijo + "setdesc La descripción del grupo fue actualizada por @admin 📜";
                    break;
                case "setsubject":
                    ejemplo = prefijo + "setsubject El nombre del grupo cambió a @group ✨";
                    break;
                case "setannounce":
                    ejemplo = prefijo + "setannounce El grupo ahora solo permite mensajes de admins 🔒";
                    break;
                case "setrestrict":
                    ejemplo = prefijo + "setrestrict Solo los admins pueden editar la info del grupo ⚙️";
                    break;
            }
            return m.reply(`${m.e.warn} Usa correctamente:\n${ejemplo}`);
        }
        const campoMap = {
            setdesc: "sDesc",
            setsubject: "sSubject",
            setannounce: "sAnnounce",
            setrestrict: "sRestrict"
        };
        const campo = campoMap[cmd];
        if (!campo)
            return m.reply(m.e.error + " Comando no reconocido.");
        await db.query(`INSERT INTO chats (group_id, ${campo})
       VALUES ($1, $2)
       ON CONFLICT (group_id) DO UPDATE SET ${campo} = $2`, [chatId, text.trim()]);
        await m.reply(`✅ Mensaje personalizado para *${cmd.replace("set", "").toUpperCase()}* actualizado.\n\n📜 ${text}`);
    }
};
