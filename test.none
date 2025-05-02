// Import necessary Node.js modules
const fs = require('fs').promises; // Use promises API for async/await
const path = require('path');
const util = require('util'); // For deep object inspection
const readline = require('readline'); // For command-line input

// Configuration for the AI API
const config = {
    key: "gemini", // Replace with your actual key if needed
    baseurl: "https://snemc-geminibalance.hf.space/v1/chat/completions",
    model: "gemini-2.5-pro-exp-03-25",
    system_prompt: "你是一个中文助手，帮助用户回答问题,回答时需要使用中文 ",
    temperature: 0.7,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0
};

// Initialize conversation history with the system prompt
let history_messages = [
    { role: 'system', content: config.system_prompt }
];

// --- Helper Functions ---

/**
 * @description 根据本地文件路径获取图片的Base64编码 (Node.js)
 * @param {string} filePath 本地图片的文件路径
 * @returns {Promise<string|null>} 返回图片的Base64编码字符串 (Data URL)，如果失败则返回 null
 */
async function getImageBase64(filePath) {
    try {
        const buffer = await fs.readFile(filePath);
        const base64String = buffer.toString('base64');
        const ext = path.extname(filePath).toLowerCase();
        let mimeType = 'application/octet-stream';
        if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
        else if (ext === '.gif') mimeType = 'image/gif';
        else if (ext === '.bmp') mimeType = 'image/bmp';
        else if (ext === '.webp') mimeType = 'image/webp';
        const dataUrl = `data:${mimeType};base64,${base64String}`;
        return dataUrl;
    } catch (error) {
        console.error(`Error reading or converting file "${filePath}" to Base64:`, error);
        return null;
    }
}

/**
 * @description 处理 API 的流式响应 (SSE)，打印内容块，累积完整内容，并将其作为助手消息添加到 history_messages。
 * @param {Response} response fetch API 的响应对象
 * @returns {Promise<object|null>} 返回成功添加的助手消息对象，如果处理失败则返回 null
 */
async function handleApiResponse(response) {
    // Assume history_messages is defined in an accessible outer scope
    if (!response.ok) {
        console.error(`Network response error: ${response.status} ${response.statusText}`);
        // Throw or return null/error indicator based on desired error handling
        throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let partialLine = '';
    let accumulatedContent = '';

    process.stdout.write("Assistant: "); // Indicate start of AI response

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = (partialLine + chunk).split('\n');
            partialLine = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataString = line.substring(6).trim();
                    if (dataString === '[DONE]') {
                        // Stream ended via [DONE] message
                        process.stdout.write('\n'); // Newline after streaming ends
                        const assistantMessage = { role: "assistant", content: accumulatedContent };
                        history_messages.push(assistantMessage); // FIXED: Push to history
                        return assistantMessage;
                    }
                    try {
                        const jsonData = JSON.parse(dataString);
                        if (jsonData.choices && jsonData.choices[0] && jsonData.choices[0].delta && jsonData.choices[0].delta.content) {
                            const contentChunk = jsonData.choices[0].delta.content;
                            process.stdout.write(contentChunk); // Print chunk
                            accumulatedContent += contentChunk; // Accumulate content
                        }
                    } catch (e) { /* Ignore JSON parse errors */ }
                }
            }
        } // End while loop

        // Process final fragment
        if (partialLine.startsWith('data: ')) {
             const dataString = partialLine.substring(6).trim();
             if (dataString !== '[DONE]') {
                 try {
                     const jsonData = JSON.parse(dataString);
                     if (jsonData.choices && jsonData.choices[0] && jsonData.choices[0].delta && jsonData.choices[0].delta.content) {
                         const finalContentChunk = jsonData.choices[0].delta.content;
                         process.stdout.write(finalContentChunk); // Print final chunk
                         accumulatedContent += finalContentChunk; // Accumulate final content
                     }
                 } catch (e) { /* Ignore JSON parse errors */ }
             }
        }
        process.stdout.write('\n'); // Newline after streaming ends

    } catch(error) {
        process.stdout.write('\n'); // Ensure newline even if error occurs during streaming
        console.error("\nError reading stream:", error);
        // Don't push incomplete message, maybe return null or rethrow
        throw error; // Rethrow error to be caught by caller
    } finally {
        reader.releaseLock();
    }

    // Stream ended normally (done: true)
    const assistantMessage = { role: "assistant", content: accumulatedContent };
    history_messages.push(assistantMessage); // FIXED: Push to history
    return assistantMessage;
}


/**
 * @description 发送聊天请求到 API 并处理响应。
 * @param {Array<object>} messages 包含完整对话历史的消息数组
 * @returns {Promise<object|null>} 返回成功添加的助手消息对象，如果请求或处理失败则返回 null
 */
async function sendChatRequest(messages) {
    try {
        const response = await fetch(config.baseurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.key}` // Assuming key is the bearer token
            },
            body: JSON.stringify({
                model: config.model,
                messages: messages,
                stream: true, // Ensure streaming is enabled
                temperature: config.temperature,
                top_p: config.top_p,
                frequency_penalty: config.frequency_penalty,
                presence_penalty: config.presence_penalty
                // Add other parameters like max_tokens if needed
            })
        });

        // Handle the streaming response (prints + pushes to history)
        return await handleApiResponse(response);

    } catch (error) {
        console.error("\nError during chat request:", error);
        return null; // Indicate failure
    }
}

// --- Main CLI Logic ---

// Setup readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Main interaction loop
async function askQuestion() {
    rl.question("You: ", async (input) => {
        const trimmedInput = input.trim();
        if (!trimmedInput) {
            // If user just presses Enter, ask again without processing
            askQuestion();
            return;
        }

        if (trimmedInput.toLowerCase() === 'exit' || trimmedInput.toLowerCase() === 'quit') {
            rl.close();
            return;
        }

        // Add user message to history
        history_messages.push({ role: "user", content: trimmedInput });

        // Send history to AI and wait for response handling
        const assistantResponse = await sendChatRequest(history_messages);

        if (!assistantResponse) {
            // Handle potential API error - maybe remove last user message?
            console.log("Assistant: Sorry, I encountered an error.");
            // Optionally remove the failed user message: history_messages.pop();
        }

        // Optional: Log history for verification (can be commented out)
        // console.log("\n--- History Updated ---");
        // console.log(util.inspect(history_messages, { depth: null, colors: true }));
        // console.log("----------------------");


        // Ask next question
        askQuestion();
    });
}

// Start the chat
console.log(`Starting chat with ${config.model}. Type 'exit' or 'quit' to end.`);
askQuestion();

// Handle readline close event
rl.on('close', () => {
    console.log('\nExiting chat. Goodbye!');
    process.exit(0);
});
