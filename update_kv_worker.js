// 自动更新worker的KV支持功能
// 此脚本用于从官方版本自动应用KV修改

const fs = require('fs');
const path = require('path');

// 跳过语法检查，因为Cloudflare Workers使用ES模块
function validateSyntax(filePath) {
  console.log('⚠️  跳过语法检查（ES模块语法）');
  return true;
}

// KV支持补丁内容
const KV_PATCHES = {
  // 代理IP读取优先级调整
  proxyPriority: `                } else if (env.KV) {
                    // 当 env 中没有 proxy 设置时，再回退去 KV 读取
                    const kvProxy = await env.KV.get('PROXYIP');
                    if (kvProxy) {
                        // 提取有效的IP地址行（忽略注释和空行）
                        const lines = kvProxy.split(/\\r?\\n/)
                            .map(l => l.trim())
                            .filter(line => line && !line.startsWith('#') && !line.startsWith('//') && line.includes(':'));
                        
                        if (lines.length > 0) {
                            proxyIP = lines[0];
                            try {
                                proxyIPPool = (await 整理(kvProxy)).filter(Boolean);
                                // 直接使用KV中的IP池，避免被后续逻辑覆盖
                                proxyIPs = proxyIPPool;
                                proxyIP = proxyIPs[Math.floor(Math.random() * proxyIPs.length)];
                                return; // 提前返回，避免执行后续的随机选择逻辑
                            } catch (err) {
                                console.error('解析 KV PROXYIP 生成 proxyIPPool 失败:', err);
                                proxyIPPool = lines.filter(Boolean);
                                // 同样处理错误情况
                                proxyIPs = proxyIPPool;
                                proxyIP = proxyIPs[Math.floor(Math.random() * proxyIPs.length)];
                                return;
                            }
                        }
                    }
                }`,

  // KV工具函数
  kvFunctions: `// KV 相关功能
async function handleKVOperations(env, txt, content) {
    const 旧数据 = await env.KV.get(\`/\${txt}\`);
    const 新数据 = await env.KV.get(txt);
    
    // 兼容旧格式
    if (旧数据 && !新数据) {
        await env.KV.put(txt, 旧数据);
        await env.KV.delete(\`/\${txt}\`);
        return 旧数据;
    }
    
    return 新数据 || '';
}

async function updateKVContent(env, txt, content) {
    if (!env.KV) return new Response("未绑定KV空间", { status: 400 });
    
    try {
        await env.KV.put(txt, content);
        return new Response(\`已更新 \${txt}\`, { status: 200 });
    } catch (error) {
        return new Response(\`更新失败: \${error.message}\`, { status: 500 });
    }
}

function hasKVSupport(env) {
    return !!env.KV;
}

async function getKVContent(env, txt) {
    let hasKV = !!env.KV;
    let content = '';
    
    if (hasKV) {
        content = await env.KV.get(txt) || '';
    }
    
    return content;
}

// 订阅相关的 KV 功能
async function getSubscriptionFromKV(env, key = 'ADD.txt') {
    if (env.KV) {
        return await env.KV.get(key) || '';
    }
    return '';
}`,

  // 订阅KV支持
  subscriptionSupport: `    // KV 订阅支持
    if (env.KV) {
        const 优选地址列表 = await env.KV.get('ADD.txt');
        // 这里可以添加 KV 订阅的处理逻辑
    }`
};

// 关键插入点
const INSERTION_POINTS = {
  afterProxyParsing: 'proxyIPPool = proxyIP.split(/\\r?\\n/).map(l => l.trim()).filter(Boolean);',
  beforeFunctionsEnd: '// 生成订阅内容',
  beforeResponseReturn: 'return response;'
};

async function updateWorkerWithKVSupport(officialWorkerPath, outputPath) {
  try {
    let content = fs.readFileSync(officialWorkerPath, 'utf-8');
    
    // 应用所有补丁
    content = content.replace(
      INSERTION_POINTS.afterProxyParsing,
      INSERTION_POINTS.afterProxyParsing + '\n' + KV_PATCHES.proxyPriority
    );
    
    content = content.replace(
      INSERTION_POINTS.beforeFunctionsEnd,
      KV_PATCHES.kvFunctions + '\n' + INSERTION_POINTS.beforeFunctionsEnd
    );
    
    content = content.replace(
      INSERTION_POINTS.beforeResponseReturn,
      KV_PATCHES.subscriptionSupport + '\n' + INSERTION_POINTS.beforeResponseReturn
    );
    
    fs.writeFileSync(outputPath, content);
    console.log('✅ KV支持已成功应用到worker文件');
    
    // 跳过语法验证（ES模块语法）
    validateSyntax(outputPath);
    
  } catch (error) {
    console.error('❌ 应用KV支持失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('使用方法: node update_kv_worker.js <官方worker路径> <输出路径>');
    process.exit(1);
  }
  
  updateWorkerWithKVSupport(args[0], args[1]);
}

module.exports = { updateWorkerWithKVSupport, KV_PATCHES };
