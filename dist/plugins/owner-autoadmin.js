export default {
    name: "autoadmin",
    help: ["autoadmin"],
    desc: "obtener el poder xdd",
    tags: ["owner"],
    botAdmin: true,
    owner: true,
    run: async ({ conn, m, isAdmin }) => {
        if (isAdmin)
            return m.reply('Ya eres admin del grupo mi creador 🫡');
        m.react("🫡");
        await conn.groupParticipantsUpdate(m.chat, [m.sender], "promote");
    }
};
