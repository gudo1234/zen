export default {
    name: ["fake"],
    help: ["fake"],
    desc: "Joder alguien con fake chat",
    tags: ["tools"],
    register: true,
    run: async ({ conn, m, text, prefijo, cmd }) => {
        if (!text) {
            return m.reply("Uso:\n.fake @tag texto del usuario | texto del bot\nEjemplo: .fake +573001234567 texto del usuario | texto del bot");
        }
        let target = null;
        let input = text.trim();
        if (m.mentionedJid && m.mentionedJid.length) {
            target = m.mentionedJid[0];
            input = input.replace(/@\d{5,20}/, "").trim();
        }
        if (!target) {
            const numMatch = input.match(/^\+?\d{8,20}/);
            if (numMatch) {
                const num = numMatch[0].replace(/[^0-9]/g, "");
                target = num + "@s.whatsapp.net";
                input = input.replace(/^\+?\d{8,20}/, "").trim();
            }
        }
        if (!target)
            return m.reply("Falta el @tag o número");
        if (!input.includes("|")) {
            return m.reply("Formato incorrecto\nEjemplo:\n.fake @tag texto del usuario | texto del bot");
        }
        let [fakeText, botText] = input.split("|").map(v => v.trim());
        if (!fakeText || !botText) {
            return m.reply("Faltan textos\nEjemplo:\n.fake @tag texto del usuario | texto del bot");
        }
        await conn.fakeReply(m.chat, botText, target, fakeText, 'status@broadcast');
    }
};
