import cp from "child_process";
import { promisify } from "util";
const exec = promisify(cp.exec);
export default {
    name: ["speedtest", "testspeed"],
    help: ["speedtest"],
    desc: "Realiza una prueba de velocidad.",
    tags: ["main"],
    register: true,
    run: async ({ conn, m }) => {
        let o;
        m.react("🚀");
        try {
            o = await exec("python3 speed.py --secure --share 2>/dev/null");
            const { stdout, stderr } = o;
            if (stdout.trim()) {
                const urlMatch = stdout.match(/https:\/\/www\.speedtest\.net\/result\/[^\s]+/);
                if (urlMatch) {
                    const imageUrl = urlMatch[0] + '.png';
                    await conn.sendMessage(m.chat, {
                        image: { url: imageUrl },
                        caption: stdout.trim()
                    }, { quoted: m });
                }
                else {
                    await conn.sendMessage(m.chat, { text: stdout.trim() }, { quoted: m });
                }
            }
            if (stderr.trim() && !stderr.includes("Speedtest (Ookla)")) {
                await conn.sendMessage(m.chat, { text: stderr.trim() }, { quoted: m });
            }
        }
        catch (e) {
            return m.reply(e.message);
        }
    }
};
