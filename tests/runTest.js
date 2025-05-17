/**
 * 运行测试脚本
 * 使用方法: node runTest.js
 */

// 由于测试文件使用ES模块，我们需要一个额外的导入层
import('./tavilyApiTest.js').catch(error => {
  console.error('测试运行失败:', error);
}); 