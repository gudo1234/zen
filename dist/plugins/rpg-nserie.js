import { createHash } from "crypto";
import { db } from "../lib/db.js";
export default {
    name: ["myns", "nserie", "sn"],
    help: ["myns", "nserie", "sn"],
    desc: "muestra tu número de serie",
    tags: ["rg"],
    run: async ({ conn, m, prefijo }) => {
        const who = m.sender;
        const res = await db.query("SELECT registered, serial_number FROM usuarios WHERE id = $1 LIMIT 1", [who]);
        if (!res.rows[0]?.registered)
            return m.reply(`⚠️ *No estás registrado*\n\nUsa:\n${prefijo}reg nombre.edad`);
        let serial = res.rows[0].serial_number;
        // generar si no existe
        if (!serial) {
            serial = createHash("md5").update(who).digest("hex");
            await db.query("UPDATE usuarios SET serial_number = $1 WHERE id = $2", [serial, who]);
        }
        return conn.fakeReply(m.chat, serial, '0@s.whatsapp.net', `⬇️ ᴇsᴛᴇ ᴇs sᴜs ɴᴜᴍᴇʀᴏ ᴅᴇʟ sᴇʀɪᴇ ⬇️`, 'status@broadcast');
        //m.reply(serial)
    }
};
