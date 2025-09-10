const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function verifyPatch() {
  try {
    const patchFile = path.join(__dirname, '..', 'kv_proxyip_feature.patch');
    
    // 检查补丁文件是否存在
    if (!fs.existsSync(patchFile)) {
      console.error('❌ 补丁文件不存在:', patchFile);
      return false;
    }

    console.log('✅ 补丁文件存在');
    
    // 检查补丁是否可以应用
    try {
      execSync('git apply --check kv_proxyip_feature.patch', { 
        stdio: 'pipe',
        cwd: path.join(__dirname, '..')
      });
      console.log('✅ 补丁验证通过 - 可以直接应用');
      return true;
    } catch (checkError) {
      console.log('⚠️  补丁无法直接应用，可能需要手动合并');
      console.log('检查错误:', checkError.message);
      
      // 尝试显示冲突详情
      try {
        const result = execSync('git apply --reject --verbose kv_proxyip_feature.patch 2>&1 || true', {
          cwd: path.join(__dirname, '..'),
          encoding: 'utf8'
        });
        console.log('冲突详情:', result);
      } catch (rejectError) {
        console.log('无法获取详细冲突信息');
      }
      
      return false;
    }
    
  } catch (error) {
    console.error('❌ 补丁验证过程中发生错误:', error.message);
    return false;
  }
}

// 如果是直接运行此脚本
if (require.main === module) {
  const success = verifyPatch();
  process.exit(success ? 0 : 1);
}

module.exports = { verifyPatch };