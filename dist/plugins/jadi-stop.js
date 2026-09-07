export default {
    name: "stop",
    help: ["stop"],
    desc: "apagar el bot",
    tags: ["jadibot"],
    owner: true,
    run: async ({ conn, m, body }) => {
        if (conn.isMainBot)
            return conn.sendMessage(m.chat, { text: m.e.warn + " Este comando solo funciona en subbots." }, { quoted: m });
        await conn.sendMessage(m.chat, { text: "🛑 Subbot apagado correctamente. ¡Hasta pronto!" }, { quoted: m });
        await conn.logout();
        try {
            await conn.ws.close();
        }
        catch { }
    }
};
