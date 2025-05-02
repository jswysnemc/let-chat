import { apiConfig } from './config.js';

/**
 * 对话历史记录
 * 这是一个内部变量，外部通过函数访问和修改。
 * @type {Array<object>}
 */
let history_messages = [
    { role: 'system', content: apiConfig.system_prompt }
];

/**
 * 获取当前完整的对话历史记录。
 * 返回数组的浅拷贝以防止外部直接修改。
 * @returns {Array<object>} 对话历史消息数组
 */
export function getHistory() {
    // 返回浅拷贝以防止外部直接修改原始数组
    return [...history_messages];
}

/**
 * 向对话历史记录中添加一条新消息。
 * @param {string} role 消息发送者角色 ('user' 或 'assistant')
 * @param {string | Array<object>} content 消息内容 (纯文本或用于多模态输入的内容部分数组)
 */
export function addMessage(role, content) {
    // 确保 content 结构符合预期 (简单示例，实际可能需要更复杂的验证)
    if (!role || !content) {
        console.error("无法添加空消息到历史记录");
        return;
    }
    history_messages.push({ role, content });
}

/**
 * 获取系统提示信息。
 * @returns {string} 系统提示字符串
 */
export function getSystemPrompt() {
    return apiConfig.system_prompt;
}

// 如果需要重置历史记录等功能，可以在此添加更多函数
// export function resetHistory() {
//     history_messages = [
//         { role: 'system', content: apiConfig.system_prompt }
//     ];
// }