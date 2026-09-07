import { generateTokenWithTime } from "../lib/db.js";
export default {
    name: "creartoken",
    help: ["creartoken <30m|2h|3d|1w|1m>"],
    desc: "crear token premium.",
    tags: ["owner"],
    rowner: true,
    run: async ({ conn, m, args, prefijo, cmd }) => {
        const tiempo = args[0];
        if (!tiempo)
            return m.reply(`${m.e.warn} Usa: ${prefijo + cmd} <30m|2h|3d|1w|1m>`);
        const token = await generateTokenWithTime(tiempo);
        await m.reply(`✅ Token creado con duración ${tiempo}\n\`\`\`${token}\`\`\``);
    }
};
