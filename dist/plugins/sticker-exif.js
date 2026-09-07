import { db } from "../lib/db.js";
export default {
    name: ["exif"],
    help: ["exif"],
    tags: ["sticker"],
    desc: "Personaliza el packname y author de tus stickers",
    register: true,
    run: async ({ conn, m, args, prefijo, cmd }) => {
        if (!args.length)
            return m.reply(`${m.e.warn} *Uso:* ${prefijo + cmd} packname | author\n📌 *Ejemplo:* ${prefijo + cmd} LoliBot | elrebelde21`);
        const [packname, author] = args.join(" ").split("|").map(s => s.trim());
        if (!packname)
            return m.reply(m.e.warn + " Debes ingresar al menos un *packname*.");
        if (packname.length > 600)
            return m.reply(m.e.warn + " El *packname* es demasiado largo (máximo 600 caracteres).");
        if (author && author.length > 650)
            return m.reply(m.e.warn + " El *author* es demasiado largo (máximo 650 caracteres).");
        await db.query(`UPDATE usuarios SET sticker_packname = $1, sticker_author = $2 WHERE id = $3`, [packname, author || null, m.sender]);
        return m.reply(`✅ Perfecto, hemos actualizado el *EXIF* de tus stickers. Ahora cada sticker que crees tendrá:\n\n◉ *Packname:* ${packname}\n◉ *Author:* ${author || "Ninguno"}\n\n> ✨ Ahora todos tus stickers creados con *${prefijo}s* tendrán tu EXIF personalizado.`);
    }
};
