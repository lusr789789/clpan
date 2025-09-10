// 修复Unicode转义序列，还原为原始中文
const fs = require('fs');
const path = require('path');

// 常见的Unicode到中文映射
const UNICODE_MAP = {
  '\\u6574\\u7406': '整理',      // 整理
  '\\u4ee3\\u7406': '代理',      // 代理  
  '\\u8ba2\\u9605': '订阅',      // 订阅
  '\\u914d\\u7f6e': '配置',      // 配置
  '\\u8fc7\\u6ee4': '过滤',      // 过滤
  '\\u52a0\\u5bc6': '加密',      // 加密
  '\\u89e3\\u5bc6': '解密',      // 解密
  '\\u9a8c\\u8bc1': '验证',      // 验证
  '\\u8fde\\u63a5': '连接',      // 连接
  '\\u8bf7\\u6c42': '请求'       // 请求
};

function fixUnicodeEscapes(content) {
  let fixedContent = content;
  
  // 替换所有已知的Unicode转义序列
  for (const [unicode, chinese] of Object.entries(UNICODE_MAP)) {
    const regex = new RegExp(unicode, 'g');
    fixedContent = fixedContent.replace(regex, chinese);
  }
  
  // 额外处理：替换所有 \uXXXX 格式的Unicode转义
  fixedContent = fixedContent.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  return fixedContent;
}

async function processFile(filePath) {
  try {
    console.log(`处理文件: ${filePath}`);
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const fixedContent = fixUnicodeEscapes(content);
    
    // 只有内容发生变化时才写入
    if (content !== fixedContent) {
      fs.writeFileSync(filePath, fixedContent, 'utf-8');
      console.log('✅ Unicode转义序列已修复');
    } else {
      console.log('ℹ️  未发现需要修复的Unicode序列');
    }
    
  } catch (error) {
    console.error(`处理文件失败: ${error.message}`);
    process.exit(1);
  }
}

// 命令行使用
if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.log('使用方法: node fix_unicode.js <文件路径>');
    process.exit(1);
  }
  
  processFile(filePath);
}

module.exports = { fixUnicodeEscapes, processFile };