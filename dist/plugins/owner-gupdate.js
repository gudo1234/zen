import { exec } from "child_process";
import fs from "fs";
import path from "path";
export default {
    name: ["gupdate", "gitupdate", "gpush", "gitpush"],
    help: ["gupdate"],
    desc: "Sube archivos específicos a GitHub.",
    tags: ["owner"],
    rowner: true,
    run: async ({ conn, m, args }) => {
        await m.react("🔄");
        try {
            const GITHUB_REPO = process.env.GITHUB_REPO;
            const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
            if (!GITHUB_REPO || !GITHUB_TOKEN) {
                return m.reply([
                    `❌ *Faltan variables en .env*`,
                    ``,
                    `Agrega:`,
                    `GITHUB_REPO=https://github.com/tu-usuario/tu-repo`,
                    `GITHUB_TOKEN=ghp_xxxxxxxxxxxx`
                ].join('\n'));
            }
            const force = true; // args.includes("--force") || args.includes("-f");
            const cleanArgs = args.filter(a => !a.startsWith("--") && !a.startsWith("-"));
            const hasFiles = cleanArgs.some(a => a.includes('/') || a.includes('.'));
            let commitMsg = "";
            let filesToUpload = [];
            if (hasFiles) {
                const lastArg = cleanArgs[cleanArgs.length - 1];
                const maybeMsg = lastArg.includes('/') || lastArg.includes('.') ? null : lastArg;
                if (maybeMsg) {
                    filesToUpload = cleanArgs.slice(0, -1);
                    commitMsg = maybeMsg;
                }
                else {
                    filesToUpload = cleanArgs;
                    commitMsg = `Actualización ${new Date().toLocaleString()}`;
                }
            }
            else {
                filesToUpload = [
                    "dist/",
                    "src/",
                    ".env",
                    "package.json",
                    "tsconfig.json",
                    "types.d.ts"
                ];
                commitMsg = cleanArgs.length > 0 ? cleanArgs.join(" ") : `Actualización ${new Date().toLocaleString()}`;
            }
            const cwd = process.cwd();
            let repoPath = GITHUB_REPO;
            if (repoPath.includes('github.com/')) {
                repoPath = repoPath.split('github.com/')[1];
            }
            if (repoPath.endsWith('/')) {
                repoPath = repoPath.slice(0, -1);
            }
            const repoUrl = `https://${GITHUB_TOKEN}@github.com/${repoPath}`;
            // Eliminar bloqueo
            try {
                const lockPath = path.join(cwd, '.git', 'index.lock');
                if (fs.existsSync(lockPath)) {
                    fs.unlinkSync(lockPath);
                }
            }
            catch (e) { }
            const existingFiles = filesToUpload.filter(f => {
                const fullPath = path.join(cwd, f);
                return fs.existsSync(fullPath);
            });
            if (existingFiles.length === 0) {
                await m.react("❌");
                return m.reply(`❌ *No se encontraron los archivos:*\n${filesToUpload.join('\n')}`);
            }
            await m.reply([`⏳ *Subiendo a GitHub...*`,
                `📝 ${commitMsg}`,
                `📂 ${existingFiles.join(', ')}`,
                `🔗 https://github.com/${repoPath}`
            ].join('\n'));
            const addFiles = existingFiles.join(' ');
            // COMANDO CON FORCE SIEMPRE
            const cmd = `
                git init &&
                git config user.name "Bot" &&
                git config user.email "bot@github.com" &&
                git remote add origin ${repoUrl} 2>/dev/null || git remote set-url origin ${repoUrl} &&
                git checkout -B main &&
                git pull origin main --allow-unrelated-histories --no-edit 2>/dev/null || true &&
                git add ${addFiles} &&
                git commit -m "${commitMsg.replace(/"/g, '\\"')}" 2>/dev/null || true &&
                git push --force --set-upstream origin main
            `;
            exec(cmd, { cwd, maxBuffer: 1024 * 1024 * 10 }, async (err, stdout, stderr) => {
                if (err) {
                    console.error("❌ Error:", err);
                    await m.react("❌");
                    return m.reply(`❌ ${err.message}`);
                }
                await m.react("✅");
                await m.reply(`✅ *Subido con éxito!*`, `\n📝 ${commitMsg}\n${GITHUB_REPO}`);
            });
        }
        catch (error) {
            await m.react("❌");
            await m.reply(`❌ ${error.message}`);
        }
    }
};
