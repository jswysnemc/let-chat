/**
 * Tavily API 测试文件
 * 用于测试搜索和提取功能是否正常工作
 */

import tavilyAPI from '../src/api/tavilyAPI.js';

// 在此处填入您的Tavily API密钥用于测试
const API_KEY = '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';

// 测试搜索功能
async function testSearch() {
    console.log('=========== 开始测试搜索功能 ===========');
    try {
        const query = 'ChatGPT与Claude的区别';
        console.log(`执行搜索，查询: "${query}"...`);
        
        const searchResults = await tavilyAPI.search(API_KEY, query, {
            maxResults: 3,
            searchDepth: 'basic'
        });
        
        console.log('搜索成功! 结果摘要:');
        console.log(`- 结果数量: ${searchResults.results.length}`);
        console.log(`- 直接回答: ${searchResults.answer.substring(0, 100)}...`);
        console.log('- 结果列表:');
        
        searchResults.results.forEach((result, index) => {
            console.log(`  [${index + 1}] ${result.title} (${result.url.substring(0, 40)}...)`);
            console.log(`      ${result.content.substring(0, 100)}...`);
        });
        
        console.log('搜索测试成功!');
        return true;
    } catch (error) {
        console.error('搜索测试失败:', error);
        return false;
    }
}

// 测试提取功能
async function testExtract() {
    console.log('\n=========== 开始测试提取功能 ===========');
    try {
        const url = 'https://www.anthropic.com/news/claude-3-family';
        console.log(`执行内容提取，URL: "${url}"...`);
        
        const extractResult = await tavilyAPI.extract(API_KEY, url);
        
        console.log('提取成功! 结果摘要:');
        console.log(`- 标题: ${extractResult.title || '无标题'}`);
        console.log(`- 内容长度: ${extractResult.content ? extractResult.content.length : 0} 字符`);
        if (extractResult.content) {
            console.log(`- 内容预览: ${extractResult.content.substring(0, 200)}...`);
        }
        
        console.log('提取测试成功!');
        return true;
    } catch (error) {
        console.error('提取测试失败:', error);
        return false;
    }
}

// 运行所有测试
async function runAllTests() {
    console.log('======================================');
    console.log('         Tavily API 测试开始          ');
    console.log('======================================');
    
    if (!API_KEY || API_KEY === '在此处填入您的API密钥') {
        console.error('错误: 请在测试文件中设置有效的 Tavily API 密钥后再运行测试');
        return;
    }
    
    const searchSuccess = await testSearch();
    const extractSuccess = await testExtract();
    
    console.log('\n======================================');
    console.log('         Tavily API 测试结果          ');
    console.log('======================================');
    console.log(`搜索功能: ${searchSuccess ? '✅ 通过' : '❌ 失败'}`);
    console.log(`提取功能: ${extractSuccess ? '✅ 通过' : '❌ 失败'}`);
    console.log(`总体结果: ${searchSuccess && extractSuccess ? '✅ 全部通过' : '❌ 部分失败'}`);
    console.log('======================================');
}

// 启动测试
runAllTests(); 