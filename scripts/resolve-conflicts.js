const fs = require('fs');
const path = require('path');

// 手动合并补丁的逻辑
function resolveConflicts() {
  const workerFile = path.join(__dirname, '..', '_worker.js');
  
  try {
    let content = fs.readFileSync(workerFile, 'utf8');
    
    console.log('开始手动合并补丁...');
    
    // 修改1: 在proxyIP处理部分添加KV获取逻辑
    const proxyIPPattern = /proxyIP = env\.PROXYIP \|\| env\.proxyip \|\| proxyIP;/;
    if (proxyIPPattern.test(content)) {
      const kvProxyIPCode = `
            // 如果proxyIP为空，尝试从KV空间的PROXYIP获取
            if (!proxyIP || proxyIP === '') {
                try {
                    if (env.KV) {
                        const kvProxyIP = await env.KV.get('PROXYIP');
                        if (kvProxyIP && kvProxyIP !== '') {
                            proxyIP = kvProxyIP;
                            
                            // 将KV空间的PROXYIP内容也添加到proxyIPPool中
                            const kvProxyIPs = await 整理(kvProxyIP);
                            proxyIPPool = proxyIPPool.concat(kvProxyIPs);
                        }
                    }
                } catch (error) {
                    console.error('从KV获取PROXYIP失败:', error);
                }
            }`;
      
      content = content.replace(proxyIPPattern, `$&${kvProxyIPCode}`);
      console.log('✅ 已添加KV PROXYIP获取逻辑');
    } else {
      console.log('⚠️  找不到proxyIP处理模式，可能需要手动定位');
    }
    
    // 修改2: 更新整理函数处理#注释
    const zhengliPattern = /const 地址数组 = 替换后的内容\.split\(','\);\s+return 地址数组;/;
    if (zhengliPattern.test(content)) {
      const zhengliReplacement = `const 地址数组 = 替换后的内容.split(',');
    
    // 处理每个地址，忽略#后面的内容
    const 处理后的数组 = 地址数组.map(地址 => {
        // 去除首尾空格
        地址 = 地址.trim();
        
        // 如果有#符号，只保留#前面的部分
        if (地址.includes('#')) {
            地址 = 地址.split('#')[0].trim();
        }
        
        return 地址;
    });
    
    return 处理后的数组;`;
      
      content = content.replace(zhengliPattern, zhengliReplacement);
      console.log('✅ 已更新整理函数处理逻辑');
    } else {
      console.log('⚠️  找不到整理函数模式，可能需要手动定位');
    }
    
    // 保存修改后的文件
    fs.writeFileSync(workerFile, content, 'utf8');
    console.log('✅ 手动合并完成');
    
    return true;
    
  } catch (error) {
    console.error('❌ 手动合并失败:', error.message);
    return false;
  }
}

// 如果是直接运行此脚本
if (require.main === module) {
  const success = resolveConflicts();
  process.exit(success ? 0 : 1);
}

module.exports = { resolveConflicts };