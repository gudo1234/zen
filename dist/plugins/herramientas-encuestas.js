export default {
    name: ["encuestas", "poll"],
    help: ["encuestas", "poll"],
    tags: ["tools"],
    desc: "Crear una encuesta",
    group: true,
    register: true,
    run: async ({ conn, m, prefijo, cmd, text }) => {
        if (!text) {
            return m.reply(`❌ Usa así:\n${prefijo + cmd} | Pregunta | opción 1 | opción 2 | opción 3`);
        }
        // separar por |
        const parts = text.split("|").map(v => v.trim()).filter(Boolean);
        if (parts.length < 3) {
            return m.reply("❌ Mínimo 1 pregunta y 2 opciones.");
        }
        const title = parts.shift();
        const options = parts;
        if (options.length > 12) {
            return m.reply("❌ Máximo 12 opciones (limitación de WhatsApp).");
        }
        await conn.sendMessage(m.chat, {
            poll: {
                name: title,
                values: options,
                selectableCount: 1,
                toAnnouncementGroup: false
            }
        }, { quoted: null });
    }
};
