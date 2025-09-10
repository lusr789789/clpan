/**
 * patch_worker.js
 * 用于替换 _worker.js 中 proxyIP 逻辑
 */

const fs = require("fs");
const path = "./_worker.js";

(async () => {
  try {
    let content = fs.readFileSync(path, "utf8");

    // 新的 proxyIP 逻辑
    const newLogic = `
let proxyIP = '';
let proxyIPPool = [];
try {
    const envProxy = env.PROXYIP || env.proxyip || proxyIP;
    if (envProxy && envProxy.trim()) {
        proxyIP = envProxy;
        try {
            proxyIPPool = (await 整理(proxyIP)).filter(Boolean);
        } catch (err) {
            console.error('解析 env PROXYIP 失败:', err);
            proxyIPPool = proxyIP.split(/\\r?\\n/).map(l => l.trim()).filter(Boolean);
        }
    } else if (env.KV) {
        const kvProxy = await env.KV.get('PROXYIP');
        if (kvProxy) {
            const lines = kvProxy.split(/\\r?\\n/).map(l => l.trim()).filter(Boolean);
            proxyIP = lines.length > 0 ? lines[0] : '';
            try {
                proxyIPPool = (await 整理(kvProxy)).filter(Boolean);
            } catch (err) {
                console.error('解析 KV PROXYIP 失败:', err);
                proxyIPPool = lines.slice();
            }
        }
    }
} catch(e) {
    console.error('读取 PROXYIP 配置失败:', e);
}
proxyIP = (proxyIPPool && proxyIPPool.length > 0) ? proxyIPPool[Math.floor(Math.random() * proxyIPPool.length)] : '';
`;

    // 简单做法：在文件开头插入新逻辑
    content = newLogic + "\n" + content;

    fs.writeFileSync(path, content, "utf8");
    console.log("_worker.js 已更新完成！");
  } catch (err) {
    console.error("更新 _worker.js 出错:", err);
    process.exit(1);
  }
})();
