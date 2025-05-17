import { getApiConfig } from './config.js';
import { isWebSearchActive } from './ui/webSearchToggle.js'; // 新增：导入联网搜索状态检查函数
import { functions_desc } from './tools/functions_desc.js'; // 新增：导入函数描述
import { search_tool, extract_tool } from './tools/tavilySearchServer.js'; // 新增：导入工具函数

// 工具映射表，方便根据名称调用
const availableTools = {
    "search_tool": search_tool,
    "extract_tool": extract_tool
};

/**
 * 处理 SSE 流数据块并提取内容或工具调用。
 * @param {string} line - SSE 流中的一行数据 (例如, "data: {...}")
 * @returns {object|null} 解析后的 JSON 数据块，或在 [DONE] 或空行时返回 null。
 */
function parseSSELine(line) {
    if (line.startsWith('data: ')) {
        const dataString = line.substring(6).trim();
        if (dataString === '[DONE]') {
            return { done: true }; // 特殊标记表示流结束
        }
        try {
            return JSON.parse(dataString);
        } catch (parseError) {
            console.warn("无法解析流数据块:", dataString, parseError);
            return { error: "parse_error", data: dataString }; // 返回错误标记
        }
    }
    return null; // 空行或其他非数据行
}

/**
 * 调用 AI API (OpenAI 兼容) 并以异步生成器方式流式返回响应内容块。
 * @param {Array<object>} messages - 发送给 API 的消息历史记录数组。
 * @param {boolean} useFunctionCalling - 是否启用函数调用流程。
 * @yields {string} 从流中解码出的 AI 响应内容块或错误信息。
 */
async function* callAIWithFetch(currentMessages, useFunctionCalling) {
    const apiConfig = getApiConfig();
    const requestBody = {
        model: apiConfig.model,
        messages: currentMessages,
        stream: true,
        temperature: apiConfig.temperature || 0.7,
        top_p: apiConfig.top_p || 1,
    };

    if (useFunctionCalling) {
        const tools = functions_desc();
        if (tools && tools.length > 0) {
            requestBody.tools = tools;
            requestBody.tool_choice = "auto"; // 或者临时改为强制调用进行测试 e.g. {"type": "function", "function": {"name": "search_tool"}}
            console.log('[callAIWithFetch] 函数调用模式，使用的工具定义:', JSON.stringify(tools));
        } else {
            useFunctionCalling = false; // 没有可用工具，禁用函数调用
            console.log("[callAIWithFetch] 没有可用的工具描述，回退到标准模式。");
        }
    }
    console.log('[callAIWithFetch] 发送给 API 的请求体 (部分，消息省略，除非消息很少):', 
        {
            ...requestBody, 
            messages: currentMessages.length > 2 ? `[${currentMessages.length} messages]` : currentMessages 
        }
    );

    let response;
    try {
        response = await fetch(apiConfig.baseurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.key}`
            },
            body: JSON.stringify(requestBody)
        });
    } catch (networkError) {
        console.error("API fetch network error:", networkError);
        yield JSON.stringify({ error: `网络错误: ${networkError.message}` });
        return;
    }

    if (!response.ok) {
        let errorText = `API 请求失败: ${response.status} ${response.statusText}`;
        try {
            const errDetails = await response.text();
            errorText += ` - ${errDetails}`;
        } catch (e) { /* 忽略读取错误详情时的错误 */ }
        console.error(errorText);
        yield JSON.stringify({ error: errorText });
        return;
    }

    if (!response.body) {
        yield JSON.stringify({ error: "API 响应体为空" });
        return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let collectedToolCalls = [];
    let assistantContentBuffer = null; // 用于收集 finish_reason=tool_calls 前的 content

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                if (buffer.trim().length > 0) {
                    console.warn("Stream ended with unprocessed buffer:", buffer);
                    // 尝试处理最后的buffer内容，如果它包含有效的JSON块
                    const jsonData = parseSSELine("data: " + buffer.trim()); // 假设buffer内容是单个JSON对象字符串
                    if (jsonData && jsonData.choices && jsonData.choices[0]?.delta?.content) {
                        yield jsonData.choices[0].delta.content;
                    }
                }
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            let lines = buffer.split('\n');
            buffer = lines.pop() || ''; // 保留最后不完整的一行

            for (const line of lines) {
                const jsonData = parseSSELine(line);
                if (!jsonData) continue;

                // console.log("[callAIWithFetch] Received SSE data line:", line); // 日志1：原始数据行

                if (jsonData.done) {
                    console.log("[callAIWithFetch] Received [DONE] signal from API.");
                    continue;
                }
                if (jsonData.error) {
                    console.warn("[callAIWithFetch] SSE 行数据解析错误，跳过该行", jsonData.data);
                    continue;
                }

                const choice = jsonData.choices && jsonData.choices[0];
                if (!choice) {
                    // console.log("[callAIWithFetch] SSE data without choices or choice[0]:", jsonData);
                    continue;
                }

                console.log("[callAIWithFetch] API 返回的 choice delta:", JSON.stringify(choice.delta), "Finish Reason:", choice.finish_reason); // 日志2：Delta 和 Finish Reason

                if (choice.delta?.content) {
                    if (useFunctionCalling) {
                        if (assistantContentBuffer === null) assistantContentBuffer = "";
                        assistantContentBuffer += choice.delta.content;
                    } else {
                        yield choice.delta.content; // 非函数调用模式，直接输出
                    }
                }

                if (useFunctionCalling && choice.delta?.tool_calls) {
                    for (const toolCallChunk of choice.delta.tool_calls) {
                        if (!collectedToolCalls[toolCallChunk.index]) {
                            collectedToolCalls[toolCallChunk.index] = { id: "", type: "function", function: { name: "", arguments: "" } };
                        }
                        const currentToolCall = collectedToolCalls[toolCallChunk.index];
                        if (toolCallChunk.id) currentToolCall.id = toolCallChunk.id;
                        if (toolCallChunk.function?.name) currentToolCall.function.name += toolCallChunk.function.name;
                        if (toolCallChunk.function?.arguments) currentToolCall.function.arguments += toolCallChunk.function.arguments;
                    }
                }

                if (useFunctionCalling && choice.finish_reason === "tool_calls") {
                    console.log("[callAIWithFetch] AI 请求工具调用。收集到的工具调用数据:", JSON.stringify(collectedToolCalls));
                    console.log("[callAIWithFetch] AI 请求工具调用前的内容 (assistantContentBuffer):", assistantContentBuffer);
                    if (assistantContentBuffer) {
                        // 如果AI在请求工具调用前有文本内容，先将其作为一条消息加入
                        // （根据OpenAI规范，此时的assistant message的content字段可以有内容）
                        // 在UI层面，这部分内容不会立即显示，会等待函数调用完成后的最终总结
                    }
                    const assistantResponseWithMessage = {
                        role: "assistant",
                        content: assistantContentBuffer, // 可以为 null
                        tool_calls: collectedToolCalls.filter(tc => tc.id && tc.function.name)
                    };
                    currentMessages.push(assistantResponseWithMessage);

                    // 执行工具调用
                    const toolPromises = assistantResponseWithMessage.tool_calls.map(async (toolCall) => {
                        const functionName = toolCall.function.name;
                        let functionArgs;
                        try {
                            functionArgs = JSON.parse(toolCall.function.arguments);
                        } catch (e) {
                            console.error(`解析工具 ${functionName} 参数失败: ${toolCall.function.arguments}`, e);
                            return { tool_call_id: toolCall.id, role: "tool", name: functionName, content: JSON.stringify({ error: `参数解析错误: ${e.message}` }) };
                        }

                        if (availableTools[functionName]) {
                            console.log(`调用工具: ${functionName}，参数:`, functionArgs);
                            let result;
                            try {
                                if (functionName === "search_tool") {
                                    result = await availableTools[functionName](functionArgs.query, functionArgs.options || {});
                                } else if (functionName === "extract_tool") {
                                    result = await availableTools[functionName](functionArgs.urls, functionArgs.options || {});
                                }
                                console.log(`工具 ${functionName} 执行结果:`, result);
                                return { tool_call_id: toolCall.id, role: "tool", name: functionName, content: result };
                            } catch (e) {
                                console.error(`工具 ${functionName} 执行出错:`, e);
                                return { tool_call_id: toolCall.id, role: "tool", name: functionName, content: JSON.stringify({ error: `工具 ${functionName} 执行失败: ${e.message}` }) };
                            }
                        } else {
                            console.warn(`请求调用未知工具: ${functionName}`);
                            return { tool_call_id: toolCall.id, role: "tool", name: functionName, content: JSON.stringify({ error: `未知工具: ${functionName}` }) };
                        }
                    });

                    const toolResults = await Promise.all(toolPromises);
                    currentMessages.push(...toolResults);

                    // 重置，为下一次请求（获取总结）做准备
                    collectedToolCalls = [];
                    assistantContentBuffer = null;

                    // 将工具结果发回API获取总结 (递归或迭代调用)
                    // 这里我们使用一个新的生成器实例来处理第二次调用并流式输出其结果
                    const finalResponseGenerator = callAIWithFetch(currentMessages, false); // 第二次调用时不应再尝试函数调用
                    for await (const finalChunk of finalResponseGenerator) {
                        yield finalChunk;
                    }
                    return; // 结束当前生成器的执行，因为最终响应已由新的生成器处理
                }

                if (choice.finish_reason === "stop") {
                    console.log("[callAIWithFetch] AI 以 finish_reason: 'stop' 结束对话/回合。");
                     // 如果是函数调用流程中，且 assistantContentBuffer 有内容，说明AI决定在工具调用前就已完成对话
                    if (useFunctionCalling && assistantContentBuffer) {
                        console.log("[callAIWithFetch] 函数调用模式下 stop，输出 assistantContentBuffer:", assistantContentBuffer);
                        yield assistantContentBuffer;
                        assistantContentBuffer = null;
                    } else if (!useFunctionCalling && choice.delta?.content) {
                        // 在非函数调用模式下，如果是因为 stop 结束，并且 delta 中还有 content，也要 yield
                        // （尽管大部分内容应该在之前的 delta.content 判断中已 yield）
                        // 但通常finish_reason=stop时，delta.content会是null或空
                    }
                    return; // 正常流结束
                }
            }
        }
    } catch (streamError) {
        console.error("读取响应流时出错:", streamError);
        yield JSON.stringify({ error: `读取响应流时出错: ${streamError.message}` });
    } finally {
        try {
            reader.releaseLock();
        } catch (releaseError) {
            console.warn("Error releasing stream lock:", releaseError);
        }
    }
}

export async function* streamAIResponse(messages) {
    const useFunctionCallingFlow = isWebSearchActive();
    let messagesForAPI = [...messages]; // 克隆原始消息数组，以避免修改原始数据

    if (useFunctionCallingFlow) {
        console.log('联网搜索已激活，使用函数调用流程 (fetch)...');
        // 动态添加系统提示以指导AI使用工具
        const toolUsageSystemPrompt = {
            role: "system",
            content: "You have access to the following tools:\n"
                   + "- 'search_tool': Use this tool to search the internet for up-to-date information or when the user asks for current events, specific facts, or general knowledge that might require external lookup. For example, if the user asks 'What is the weather like in London?' or 'Tell me about the latest AI research.', you should use this tool.\n"
                   + "- 'extract_tool': Use this tool to extract structured content from a specific webpage URL. Only use this if the user provides a URL and asks to get content from it.\n\n"
                   + "Please think step-by-step if a user's query can be answered by using these tools. If so, call the appropriate tool with the correct arguments. If you can answer directly without the tools, do so.\n"
                   + "Important: When you summarize the information retrieved using the 'search_tool', you must clearly cite the webpage URL for each piece of information in your summary. For example: 'According to [Source Name](URL), the information is as follows:...' or 'Source: URL'.\n"
                   + "Note: When using tools, please ensure you provide accurate and relevant information, avoiding outdated or incorrect data."
        };
        // 将系统提示加到消息列表的开头，或者可以考虑其他注入位置
        // 如果消息历史中已经有系统消息，可以考虑合并或替换，或者确保此条新消息不会冲突
        // 为简单起见，我们这里直接加在最前面，但如果已有系统消息，更好的做法是加在用户消息之前
        if (messagesForAPI.length > 0 && messagesForAPI[0].role === "system") {
            // 如果第一条是系统消息，我们附加到其内容，或者替换它。这里选择附加。
            // 注意：简单附加可能导致系统提示过长或格式混乱，实际项目中可能需要更复杂的合并逻辑。
            // messagesForAPI[0].content += "\n\n" + toolUsageSystemPrompt.content; 
            // 或者，更安全的方式是将其作为一条独立的新系统消息插入到第一个用户消息之前
            // 寻找第一个非系统消息的位置
            let firstUserMessageIndex = messagesForAPI.findIndex(msg => msg.role !== 'system');
            if (firstUserMessageIndex === -1) firstUserMessageIndex = messagesForAPI.length; // 如果全是系统消息，则加到最后
            messagesForAPI.splice(firstUserMessageIndex, 0, toolUsageSystemPrompt);
        } else {
            messagesForAPI.unshift(toolUsageSystemPrompt); // 加到最前面
        }
        console.log("[streamAIResponse] 已添加工具使用系统提示.");

    } else {
        console.log('联网搜索未激活或无可用工具，执行标准API请求 (fetch)...');
    }
    
    // 使用处理过的 messagesForAPI 数组
    const generator = callAIWithFetch(messagesForAPI, useFunctionCallingFlow);
    for await (const chunk of generator) {
        yield chunk;
    }
}