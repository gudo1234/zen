import { getPlugins, getPlugin } from "../lib/plugins.js";
import { db } from "../lib/db.js";

function levenshtein(a, b) {
    const matrix = Array.from(
        { length: b.length + 1 },
        (_, i) => [i]
    );

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] +
                    (b[i - 1] === a[j - 1] ? 0 : 1)
            );
        }
    }

    return matrix[b.length][a.length];
}

function similarity(a, b) {
    if (!a || !b) return 0;

    const max = Math.max(a.length, b.length);

    if (!max) return 100;

    return Math.round(
        (1 - levenshtein(a, b) / max) * 100
    );
}

function getHelpCommands(plugin) {
    const result = [];

    if (typeof plugin.name === "string") {
        result.push(plugin.name);
    }

    if (Array.isArray(plugin.name)) {
        result.push(...plugin.name);
    }

    if (typeof plugin.command === "string") {
        result.push(plugin.command);
    }

    if (Array.isArray(plugin.command)) {
        result.push(...plugin.command);
    }

    if (plugin.command instanceof RegExp) {
        return result;
    }

    if (typeof plugin.help === "string") {
        result.push(plugin.help);
    }

    if (Array.isArray(plugin.help)) {
        result.push(...plugin.help);
    }

    return result
        .map(x => String(x).trim().toLowerCase())
        .map(x => x.split(/\s+/)[0])
        .filter(Boolean);
}

async function getUserFlag(m) {
    const sender = m.sender || "";

    // Si es LID/número oculto, no mostrar bandera
    if (!sender.endsWith("@s.whatsapp.net")) {
        return "";
    }

    const number = sender.split("@")[0];

    if (!/^\d{10,15}$/.test(number)) {
        return "";
    }

    try {
        const res = await fetch(
            `https://api.mitzuki.xyz/tools/country?number=${number}&apikey=${process.env.API_KEY}`
        );

        const json = await res.json();

        if (json?.status && json.data?.emoji) {
            return json.data.emoji;
        }
    } catch {}

    return "";
}

async function isCustomCommand(m, cmd, prefijo, botId) {
    try {
        const prefijoCmd = `${prefijo}${cmd}`.toLowerCase();
        const cmdLower = cmd.toLowerCase();

        const res = await db.query(`
            SELECT 1
            FROM custom_commands
            WHERE bot_id = $1
              AND group_id = $2
              AND LOWER(cmd) IN ($3, $4)
            
            UNION
            
            SELECT 1
            FROM custom_commands
            WHERE bot_id = $1
              AND LOWER(cmd) IN ($3, $4)
              AND is_global = true

            LIMIT 1
        `, [
            botId,
            m.chat,
            prefijoCmd,
            cmdLower
        ]);

        return res.rows.length > 0;
    } catch {
        return false;
    }
}

export default {
    name: ["comando-no-reconocido"],
    help: ["comando-no-reconocido"],

    async before(m, { cmd, prefijo }) {
        // Solo actuar cuando realmente se escribió un prefijo
        if (!prefijo || !cmd) {
            return false;
        }

        // Si el comando existe normalmente, no hacer absolutamente nada
        if (getPlugin(cmd)) {
            return false;
        }

        // No interferir con set<comando>
        if (cmd.toLowerCase().startsWith("set") && cmd.length > 3) {
            return false;
        }

        const botId =
            m.conn?.user?.id?.split(":")[0] ||
            m.botId ||
            "unknown";

        // No interferir con comandos personalizados
        if (await isCustomCommand(m, cmd, prefijo, botId)) {
            return false;
        }

        const comandos = [];

        for (const plugin of getPlugins()) {
            const items = getHelpCommands(plugin);

            for (const item of items) {
                if (!comandos.includes(item)) {
                    comandos.push(item);
                }
            }
        }

        const similares = comandos
            .map(command => ({
                cmd: command,
                sim: similarity(
                    cmd.toLowerCase(),
                    command.toLowerCase()
                )
            }))
            .filter(x => x.sim >= 40)
            .sort((a, b) => b.sim - a.sim)
            .slice(0, 5);

        const flag = await getUserFlag(m);

        let text =
            `${flag ? flag + " " : ""}*Comando no reconocido.*\n` +
            `Usa *${prefijo}menu* para ver todos los comandos.`;

        if (similares.length) {
            text += `\n\n_*Sugerencias:*_\n`;

            text += similares
                .map(s =>
                    `> *${prefijo}${s.cmd}* (${s.sim}% parecido)`
                )
                .join("\n");
        }

        await m.reply(text);

        return true;
    }
};
