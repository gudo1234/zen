import { createHash } from "crypto";
import { db } from "../lib/db.js";
export default {
    name: ["unreg"],
    help: ["unreg <serial>"],
    tags: ["rg"],
    desc: "Elimina tu registro usando tu número de serie",
    run: async ({ conn, m, args, prefijo }) => {
        const who = m.sender;
        const serialInput = (args[0] || "").trim();
        if (!serialInput)
            return m.reply(`✳️ *Uso correcto:*\n` +
                `${prefijo}unreg <serial>\n\n` +
                `📌 Mira tu serial con:\n${prefijo}myns`);
        const res = await db.query("SELECT registered, serial_number FROM usuarios WHERE id = $1 LIMIT 1", [who]);
        if (!res.rows[0]?.registered)
            return m.reply("⚠️ *No estás registrado*");
        const realSerial = res.rows[0].serial_number ||
            createHash("md5").update(who).digest("hex");
        if (serialInput !== realSerial)
            return m.reply("❌ *Número de serie incorrecto*");
        // eliminar registro (penalización incluida)
        await db.query(`
      UPDATE usuarios SET
        registered = false,
        nombre = NULL,
        edad = NULL,
        gender = NULL,
        birthday = NULL,
        serial_number = NULL,
        money = GREATEST(money - 400, 0),
        limite = GREATEST(limite - 2, 0),
        exp = GREATEST(exp - 150, 0),
        reg_time = NULL
      WHERE id = $1
    `, [who]);
        return conn.fakeReply(m.chat, `😢 Ya no estas registrado`, '0@s.whatsapp.net', `ᴿᵉᵍᶦˢᵗʳᵒ ᵉˡᶦᵐᶦⁿᵃᵈᵒ`, 'status@broadcast');
    }
};
