const fs = require('fs');
const path = require('path');

const WORKER_PATH = path.join(process.cwd(), '_worker (1).js');

const START_TAG = '// CUSTOM_START_PROXY_INIT';
const END_TAG = '// CUSTOM_END_PROXY_INIT';

const initSnippet = `// CUSTOM_START_PROXY_INIT -- DO NOT REMOVE (用于补丁定位和自动更新)
async function initProxyFromEnvAndKV(env) {
    try {
        // 优先使用环境变量
        const envProxy = env.PROXYIP || env.proxyip || proxyIP;
        if (envProxy) {
            proxyIP = envProxy;
            try {
                proxyIPPool = (await 整理(proxyIP)).filter(Boolean);
            } catch (err) {
                proxyIPPool = proxyIP.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
            }
        } else if (env.KV) {
            // 回退到 KV（如果存在并有值）
            const kvProxy = await env.KV.get('PROXYIP');
            if (kvProxy) {
                const lines = kvProxy.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                if (lines.length) proxyIP = lines[0];
                try {
                    proxyIPPool = (await 整理(kvProxy)).filter(Boolean);
                } catch (err) {
                    proxyIPPool = lines;
                }
            }
        }
    } catch (err) {
        // 保持容错：不要中断 worker 启动
    }

    try {
        proxyIPs = proxyIP ? await 整理(proxyIP) : [];
    } catch (err) {
        proxyIPs = proxyIP ? proxyIP.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [];
    }
    if (Array.isArray(proxyIPs) && proxyIPs.length > 0) {
        proxyIP = proxyIPs[Math.floor(Math.random() * proxyIPs.length)];
    }
    // DNS64Server 保持由外部 env 控制，不在此覆盖其他逻辑
    DNS64Server = env.DNS64 || env.NAT64 || DNS64Server;
    return proxyIP;
}
// CUSTOM_END_PROXY_INIT
`;

function backupFile(filePath) {
    try {
        const stat = fs.statSync(filePath);
        if (stat && stat.isFile()) {
            const bak = `${filePath}.bak.${Date.now()}`;
            fs.copyFileSync(filePath, bak);
            console.log('Backup created:', bak);
            return bak;
        }
    } catch (e) {
        // ignore
    }
    return null;
}

function inject() {
    if (!fs.existsSync(WORKER_PATH)) {
        console.error('Target file not found:', WORKER_PATH);
        process.exit(2);
    }

    let content = fs.readFileSync(WORKER_PATH, 'utf8');

    // If already has tagged block, replace it
    if (content.includes(START_TAG) && content.includes(END_TAG)) {
        const regex = new RegExp(`${START_TAG}[\s\S]*?${END_TAG}`);
        const bak = backupFile(WORKER_PATH);
        content = content.replace(regex, initSnippet);
        fs.writeFileSync(WORKER_PATH, content, 'utf8');
        console.log('Replaced existing proxy init block. Backup:', bak || 'none');
        return;
    }

    // Try to precisely replace existing init block between proxyIP assignment and DNS64Server assignment
    // This keeps changes minimal and avoids touching unrelated code
    const proxyBlockRegex = /\n\s*proxyIP\s*=.*\n[\s\S]*?\n\s*DNS64Server\s*=.*\n/m;
    if (proxyBlockRegex.test(content)) {
        const bak = backupFile(WORKER_PATH);
        content = content.replace(proxyBlockRegex, '\n' + initSnippet + '\n');
        fs.writeFileSync(WORKER_PATH, content, 'utf8');
        console.log('Replaced proxyIP..DNS64Server init block. Backup:', bak || 'none');
        return;
    }

    // Fallback: insert after `let proxyIP = '';` declaration
    const anchor = "let proxyIP = '';";
    const idx = content.indexOf(anchor);
    if (idx !== -1) {
        const bak = backupFile(WORKER_PATH);
        const insertAt = content.indexOf('\n', idx) + 1;
        const newContent = content.slice(0, insertAt) + '\n' + initSnippet + content.slice(insertAt);
        fs.writeFileSync(WORKER_PATH, newContent, 'utf8');
        console.log('Inserted proxy init block after proxyIP declaration. Backup:', bak || 'none');
        return;
    }

    // Last resort: append
    const bak = backupFile(WORKER_PATH);
    fs.appendFileSync(WORKER_PATH, '\n' + initSnippet, 'utf8');
    console.log('Appended proxy init block at end of file. Backup:', bak || 'none');
}

inject();
