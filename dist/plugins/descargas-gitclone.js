import fetch from "node-fetch";
const userCaptions = new Map();
const userRequests = {};
const GITHUB_RE = /^(?:https?:\/\/)?github\.com\/([^/\s]+)\/([^/\s]+)(?:\/(.*))?$/i;
function cleanRepo(repo = "") {
    return repo.replace(/\.git$/i, "").replace(/[#?].*$/, "");
}
function getFileNameFromUrl(url = "") {
    try {
        const u = new URL(url);
        return decodeURIComponent(u.pathname.split("/").pop() || "github-file");
    }
    catch {
        return "github-file";
    }
}
function getMime(filename = "") {
    const f = filename.toLowerCase();
    if (f.endsWith(".apk"))
        return "application/vnd.android.package-archive";
    if (f.endsWith(".zip"))
        return "application/zip";
    if (f.endsWith(".tar.gz") || f.endsWith(".tgz"))
        return "application/gzip";
    if (f.endsWith(".rar"))
        return "application/vnd.rar";
    if (f.endsWith(".7z"))
        return "application/x-7z-compressed";
    return "application/octet-stream";
}
function parseGitHubUrl(input = "") {
    input = input.trim();
    if (input.startsWith("git@github.com:")) {
        input = input
            .replace("git@github.com:", "https://github.com/")
            .replace(/\.git$/i, "");
    }
    const match = input.match(GITHUB_RE);
    if (!match)
        return null;
    const user = match[1];
    const repo = cleanRepo(match[2]);
    const rest = match[3] || "";
    if (/^releases\/download\//i.test(rest)) {
        return {
            type: "release_asset",
            user,
            repo,
            url: input,
            filename: getFileNameFromUrl(input)
        };
    }
    if (/^archive\/refs\/heads\//i.test(rest)) {
        const branch = rest
            .replace(/^archive\/refs\/heads\//i, "")
            .replace(/\.zip$/i, "")
            .replace(/\.tar\.gz$/i, "");
        return {
            type: "repo",
            user,
            repo,
            branch: decodeURIComponent(branch)
        };
    }
    if (/^archive\/refs\/tags\//i.test(rest)) {
        const tag = rest
            .replace(/^archive\/refs\/tags\//i, "")
            .replace(/\.zip$/i, "")
            .replace(/\.tar\.gz$/i, "");
        return {
            type: "repo",
            user,
            repo,
            branch: decodeURIComponent(tag)
        };
    }
    if (/^tree\//i.test(rest)) {
        const branch = rest.replace(/^tree\//i, "").split("/")[0];
        return {
            type: "repo",
            user,
            repo,
            branch: decodeURIComponent(branch)
        };
    }
    return {
        type: "repo",
        user,
        repo,
        branch: null
    };
}
async function getDefaultBranch(user, repo) {
    const res = await fetch(`https://api.github.com/repos/${user}/${repo}`, {
        headers: {
            "User-Agent": "Mitzuki-GitClone"
        }
    });
    if (!res.ok) {
        throw new Error(`No se pudo acceder al repo: ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    return json.default_branch || "main";
}
async function checkUrl(url) {
    const res = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        headers: {
            "User-Agent": "Mitzuki-GitClone"
        }
    });
    if (!res.ok) {
        throw new Error(`No se pudo acceder al archivo: ${res.status} ${res.statusText}`);
    }
    return res;
}
export default {
    name: ["gitclone", "clonarepo", "clonarrepo", "repoclonar", "github"],
    help: ["gitclone <url>"],
    desc: "Clona y descarga un repositorio, rama o release desde GitHub.",
    tags: ["downloader"],
    register: true,
    limitPrem: true,
    limit: 1,
    run: async ({ conn, m, args, prefijo, cmd }) => {
        const input = args[0];
        if (!input)
            return m.reply(`${m.e.warn} *Ingresa un enlace válido de GitHub.*\n\n📌 Ejemplo:\n${prefijo + cmd} https://github.com/elrebelde21/LoliBot-MD`);
        const parsed = parseGitHubUrl(input);
        if (!parsed) {
            return m.reply(m.e.warn + " Ese no parece un enlace válido de GitHub, boludo 🤡");
        }
        if (userRequests[m.sender]) {
            await conn.reply(m.chat, `⏳ *Hey @${m.sender.split("@")[0]} espera...* ya estás descargando algo, aguanta un toque 😒`, userCaptions.get(m.sender) || m);
            return;
        }
        userRequests[m.sender] = true;
        await m.react("⌛");
        try {
            const replyMsg = await conn.fakeReply(m.chat, `⌛ *Calma crack*, estoy preparando el archivo...\n\n🚀 *Si no te llega, puede ser porque pesa mucho o GitHub bloqueó la descarga.*`, '0@s.whatsapp.net', `No hagan spam gil`, 'status@broadcast');
            userCaptions.set(m.sender, replyMsg);
            let downloadUrl;
            let filename;
            let caption;
            let mimetype;
            if (parsed.type === "release_asset") {
                downloadUrl = parsed.url;
                filename = parsed.filename;
                mimetype = getMime(filename);
                await checkUrl(downloadUrl);
                caption =
                    `📦 *Archivo Release:* ${filename}\n` +
                        `👤 *Autor:* ${parsed.user}\n` +
                        `📁 *Repo:* ${parsed.repo}\n` +
                        `🌐 *URL:* ${input}`;
            }
            else {
                const branch = parsed.branch || await getDefaultBranch(parsed.user, parsed.repo);
                downloadUrl =
                    `https://api.github.com/repos/${parsed.user}/${parsed.repo}/zipball/${encodeURIComponent(branch)}`;
                const head = await checkUrl(downloadUrl);
                const disposition = head.headers.get("content-disposition") || "";
                const match = disposition.match(/filename="?([^"]+)"?/i);
                filename = match?.[1] || `${parsed.repo}-${branch}.zip`;
                if (!filename.endsWith(".zip"))
                    filename += ".zip";
                mimetype = "application/zip";
                caption =
                    `📦 *Repositorio:* ${parsed.repo}\n` +
                        `👤 *Autor:* ${parsed.user}\n` +
                        `🌿 *Rama/Tag:* ${branch}\n` +
                        `🌐 *URL:* ${input}`;
            }
            await conn.sendMessage(m.chat, {
                document: { url: downloadUrl },
                mimetype,
                fileName: filename,
                caption
            }, { quoted: m });
            await m.react("✅");
            m.success = true;
        }
        catch (err) {
            console.error("❌ Error en gitclone:", err);
            await m.react("❌");
            await m.reply(`${m.e.error + m.msg.error}\n\n>>> ${err.message || err} <<<`);
        }
        finally {
            delete userRequests[m.sender];
            userCaptions.delete(m.sender);
        }
    }
};
