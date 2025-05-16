import { getApiConfig } from './config.js';

/**
 * 调用 AI API 并以异步生成器方式流式返回响应内容块。
 * @param {Array<object>} messages - 发送给 API 的消息历史记录数组。
 * @yields {string} 从流中解码出的 AI 响应内容块。
 * @throws {Error} 如果 API 请求失败或读取流时发生错误。
 */
export async function* streamAIResponse(messages) {
    // 获取当前API配置（确保每次请求都获取最新配置）
    const apiConfig = getApiConfig();
    console.log('使用API配置发送请求:', apiConfig);
    
    let response;
    try {
        response = await fetch(apiConfig.baseurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 警告：API 密钥直接在此处使用，存在安全风险！
                'Authorization': `Bearer ${apiConfig.key}`
            },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: messages,
                stream: true,
                temperature: 0.7, // 可以考虑将这些参数也移到 config.js
                top_p: 1
            })
        });
    } catch (networkError) {
        console.error("API fetch network error:", networkError);
        throw new Error(`网络错误: ${networkError.message}`);
    }

    if (!response.ok) {
        let errorText = '无法获取错误详情';
        try {
            errorText = await response.text();
        } catch (e) { /* 忽略读取错误详情时的错误 */ }
        console.error(`API request failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`API 请求失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    if (!response.body) {
        throw new Error("API 响应体为空");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = ''; // 用于处理跨块的行

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                // 处理缓冲区中剩余的任何不完整行（虽然在此 SSE 场景下不太可能）
                if (buffer.trim().length > 0) {
                     console.warn("Stream ended with unprocessed buffer:", buffer);
                }
                break; // 流结束
            }

            // 将新块添加到缓冲区并解码
            buffer += decoder.decode(value, { stream: true });

            // 按行处理缓冲区中的数据
            let lines = buffer.split('\n');

            // 保留最后一行（可能不完整）在缓冲区中
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataString = line.substring(6).trim();
                    if (dataString === '[DONE]') {
                        // [DONE] 信号表示流正常结束，在 while(true) 的 done 分支处理
                        continue; // 继续检查下一个块，直到 done 为 true
                    }
                    try {
                        const jsonData = JSON.parse(dataString);
                        if (jsonData.choices && jsonData.choices[0]?.delta?.content) {
                            const contentChunk = jsonData.choices[0].delta.content;
                            // 产生内容块给调用者
                            yield contentChunk;
                        }
                    } catch (parseError) {
                        console.warn("Failed to parse stream data chunk:", dataString, parseError);
                        // 决定是否抛出错误或仅记录警告
                        // throw new Error(`无法解析流数据: ${parseError.message}`);
                    }
                }
            }
        }
    } catch (streamError) {
        console.error("Error reading stream:", streamError);
        throw new Error(`读取响应流时出错: ${streamError.message}`);
    } finally {
        // 确保 reader 被释放
        // 注意：如果在循环中 return 或 break，finally 块也会执行
        // 如果生成器被外部提前关闭 (e.g., for await...of loop breaks), finally 可能不会执行 reader.releaseLock()
        // 更健壮的方式可能需要 try...finally 包裹 reader 的使用，但这会使代码更复杂。
        // 对于这个场景，假设正常完成或因错误退出。
         try {
             reader.releaseLock(); // 尝试释放锁
         } catch (releaseError) {
             console.warn("Error releasing stream lock:", releaseError);
         }
    }
}