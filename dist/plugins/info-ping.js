export default {
    name: "ping",
    help: ["ping"],
    desc: "Muestra la velocidad / latencia del bot",
    tags: ["main"],
    run: async ({ conn, m, body }) => {
        const start = Date.now();
        const sent = await conn.sendMessage(m.chat, { text: "🏓 Ping..." }, { quoted: m });
        const latency = Date.now() - start;
        await conn.sendMessage(m.chat, { text: `🏓 Pong: ${latency}ms`, edit: sent.key });
    }
};
