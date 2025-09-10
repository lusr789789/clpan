const fs = require('fs');
const path = require('path');

// 增强的模式匹配应用函数 - 专门处理代码条目变化
function applyEnhancedModifications(content) {
  let modifiedContent = content;
  
  console.log('开始增强模式匹配应用...');
  
  // 修改1: KV PROXYIP获取功能
  console.log('应用修改1: KV PROXYIP获取功能');
  
  // 多种可能的proxyIP赋值模式
  const proxyIPPatterns = [
    // 常见模式
    /proxyIP\s*=\s*env\.PROXYIP\s*\|\|\s*env\.proxyip\s*\|\|\s*proxyIP;/,
    /proxyIP\s*=\s*env\.PROXYIP\s*\|\|\s*env\.proxyip/,
    /proxyIP\s*=\s*env\.PROXYIP/,
    /proxyIP\s*=\s*env\.proxyip/,
    /proxyIP\s*=\s*[^;]*;/,
    // 更宽松的模式
    /proxyIP\s*=[^;]*/,
    /let proxyIP\s*=[^;]*/,
    /var proxyIP\s*=[^;]*/
  ];
  
  let proxyIPModified = false;
  for (const pattern of proxyIPPatterns) {
    const match = modifiedContent.match(pattern);
    if (match) {
      console.log(`找到proxyIP模式: ${match[0]}`);
      
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
      console.log('✅ KV PROXYIP获取逻辑添加成功');
      proxyIPModified = true;
      break;
    }
  }
  
  if (!proxyIPModified) {
    console.log('⚠️ 未找到proxyIP模式，尝试在fetch函数中插入');
    
    // 在fetch函数中寻找合适的位置插入
    const fetchFunctionMatch = modifiedContent.match(/(async\s+fetch\s*\([^)]*\)\s*{[\s\S]*?})(?=\s*$|\s*async|\s*function|\s*export)/);
    if (fetchFunctionMatch) {
      console.log('找到fetch函数，尝试在其中插入');
      
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
      
      // 在fetch函数开头附近插入
      const modifiedFetch = fetchFunctionMatch[1].replace(
        /(async\s+fetch\s*\([^)]*\)\s*{)/,
        `$1${kvProxyIPCode}`
      );
      
      modifiedContent = modifiedContent.replace(fetchFunctionMatch[1], modifiedFetch);
      console.log('✅ 在fetch函数中插入成功');
      proxyIPModified = true;
    }
  }
  
  // 修改2: 整理函数处理#注释
  console.log('应用修改2: 整理函数处理#注释');
  
  const zhengliPatterns = [
    /async function 整理\(内容\)\s*{([\s\S]*?)(return 地址数组;)([\s\S]*?)}/,
    /function 整理\(内容\)\s*{([\s\S]*?)(return 地址数组;)([\s\S]*?)}/,
    /const 整理\s*=\s*async function\(内容\)\s*{([\s\S]*?)(return 地址数组;)([\s\S]*?)}/,
    /const 整理\s*=\s*function\(内容\)\s*{([\s\S]*?)(return 地址数组;)([\s\S]*?)}/
  ];
  
  let zhengliModified = false;
  for (const pattern of zhengliPatterns) {
    const match = modifiedContent.match(pattern);
    if (match) {
      console.log('找到整理函数');
      
      const replacement = `async function 整理(内容) {
    // 将制表符、双引号、单引号和换行符都替换为逗号
    // 然后将连续的多个逗号替换为单个逗号
    var 替换后的内容 = 内容.replace(/[\t"'\r\n]+/g, ',').replace(/,+/g, ',');

    // 删除开头和结尾的逗号（如果有的话）
    if (替换后的内容.charAt(0) == ',') 替换后的内容 = 替换后的内容.slice(1);
    if (替换后的内容.charAt(替换后的内容.length - 1) == ',') 替换后的内容 = 替换后的内容.slice(0, 替换后的内容.length - 1);

    // 使用逗号分割字符串，得到地址数组
    const 地址数组 = 替换后的内容.split(',');
    
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

    return 处理后的数组;
}`;
      
      modifiedContent = modifiedContent.replace(pattern, replacement);
      console.log('✅ 整理函数更新成功');
      zhengliModified = true;
      break;
    }
  }
  
  if (!zhengliModified) {
    console.log('⚠️ 未找到整理函数，尝试创建新函数');
    
    // 在文件末尾添加新的整理函数
    const newZhengliFunction = `
/**
 * 处理内容字符串，分割为数组并忽略#注释
 */
async function 整理(内容) {
    // 将制表符、双引号、单引号和换行符都替换为逗号
    // 然后将连续的多个逗号替换为单个逗号
    var 替换后的内容 = 内容.replace(/[\t"'\r\n]+/g, ',').replace(/,+/g, ',');

    // 删除开头和结尾的逗号（如果有的话）
    if (替换后的内容.charAt(0) == ',') 替换后的内容 = 替换后的内容.slice(1);
    if (替换后的内容.charAt(替换后的内容.length - 1) == ',') 替换后的内容 = 替换后的内容.slice(0, 替换后的内容.length - 1);

    // 使用逗号分割字符串，得到地址数组
    const 地址数组 = 替换后的内容.split(',');
    
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

    return 处理后的数组;
}`;
    
    modifiedContent = modifiedContent + newZhengliFunction;
    console.log('✅ 新整理函数添加成功');
  }
  
  return modifiedContent;
}

// 主执行函数
function main() {
  try {
    const workerFile = path.join(__dirname, '..', '_worker.js');
    
    if (!fs.existsSync(workerFile)) {
      console.error('❌ _worker.js文件不存在');
      return false;
    }
    
    const content = fs.readFileSync(workerFile, 'utf8');
    const modifiedContent = applyEnhancedModifications(content);
    
    // 保存修改后的内容
    fs.writeFileSync(workerFile, modifiedContent, 'utf8');
    
    console.log('✅ 增强模式匹配应用完成');
    return true;
    
  } catch (error) {
    console.error('❌ 增强模式匹配失败:', error.message);
    return false;
  }
}

// 如果是直接运行此脚本
if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = { applyEnhancedModifications, main };