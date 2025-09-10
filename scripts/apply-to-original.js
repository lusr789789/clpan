const fs = require('fs');
const path = require('path');

// 专门针对原始GitHub代码的修改应用函数
function applyModificationsToOriginal(content) {
  let modifiedContent = content;
  
  console.log('开始应用到原始代码...');
  
  // 修改1: 在proxyIP处理部分添加KV获取逻辑
  const proxyIPPatterns = [
    /proxyIP\s*=\s*env\.PROXYIP\s*\|\|\s*env\.proxyip\s*\|\|\s*proxyIP;/,
    /proxyIP\s*=\s*env\.PROXYIP\s*\|\|\s*env\.proxyip/,
    /proxyIP\s*=\s*env\.PROXYIP/
  ];
  
  let proxyIPModified = false;
  for (const pattern of proxyIPPatterns) {
    if (pattern.test(modifiedContent)) {
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
      
      modifiedContent = modifiedContent.replace(pattern, `$&${kvProxyIPCode}`);
      console.log('✅ 已添加KV PROXYIP获取逻辑');
      proxyIPModified = true;
      break;
    }
  }
  
  if (!proxyIPModified) {
    console.log('⚠️  找不到proxyIP处理模式，尝试在合适位置插入');
    // 在export default的fetch函数中寻找合适位置
    const fetchPattern = /async fetch\(request, env, ctx\)\s*{([\s\S]*?)}/;
    const match = modifiedContent.match(fetchPattern);
    if (match) {
      const fetchContent = match[1];
      // 在fetch函数中寻找proxyIP赋值的位置
      const proxyAssignment = fetchContent.match(/proxyIP\s*=[^;]*;/);
      if (proxyAssignment) {
        console.log('找到proxyIP赋值语句，尝试在其后添加');
      }
    }
  }
  
  // 修改2: 更新整理函数处理#注释
  const zhengliPatterns = [
    /const 地址数组\s*=\s*替换后的内容\.split\(','\);\s*\n\s*return 地址数组;/,
    /const 地址数组\s*=\s*替换后的内容\.split\(','\);\s*return 地址数组;/,
    /地址数组\s*=\s*替换后的内容\.split\(','\);/,
  ];
  
  let zhengliModified = false;
  for (const pattern of zhengliPatterns) {
    if (pattern.test(modifiedContent)) {
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
      
      modifiedContent = modifiedContent.replace(pattern, zhengliReplacement);
      console.log('✅ 已更新整理函数处理逻辑');
      zhengliModified = true;
      break;
    }
  }
  
  if (!zhengliModified) {
    console.log('⚠️  找不到整理函数模式，尝试查找函数定义');
    const zhengliDefPattern = /async function 整理\(内容\)\s*{([\s\S]*?)}/;
    const match = modifiedContent.match(zhengliDefPattern);
    if (match) {
      console.log('找到整理函数定义，可以手动修改');
    }
  }
  
  return modifiedContent;
}

// 从GitHub下载原始代码并应用修改
async function downloadAndModify() {
  try {
    console.log('正在从GitHub下载原始代码...');
    
    // 使用curl或fetch下载原始代码
    const { execSync } = require('child_process');
    const originalCode = execSync('curl -s https://raw.githubusercontent.com/cmliu/edgetunnel/main/_worker.js', {
      encoding: 'utf8'
    });
    
    console.log('下载成功，开始应用修改...');
    
    // 应用修改
    const modifiedCode = applyModificationsToOriginal(originalCode);
    
    // 保存修改后的文件
    fs.writeFileSync('_worker_modified.js', modifiedCode, 'utf8');
    console.log('✅ 修改已完成，保存为 _worker_modified.js');
    
    // 比较差异
    console.log('\n📋 生成的差异:');
    execSync('git diff --no-index _worker.js _worker_modified.js | head -20', { stdio: 'inherit' });
    
  } catch (error) {
    console.error('❌ 处理失败:', error.message);
  }
}

// 如果是直接运行此脚本
if (require.main === module) {
  if (process.argv.includes('--download')) {
    downloadAndModify();
  } else {
    // 直接修改当前文件
    const workerFile = path.join(__dirname, '..', '_worker.js');
    if (fs.existsSync(workerFile)) {
      const content = fs.readFileSync(workerFile, 'utf8');
      const modifiedContent = applyModificationsToOriginal(content);
      fs.writeFileSync(workerFile, modifiedContent, 'utf8');
      console.log('✅ 当前文件修改完成');
    } else {
      console.log('⚠️  未找到_worker.js文件');
    }
  }
}

module.exports = { applyModificationsToOriginal, downloadAndModify };