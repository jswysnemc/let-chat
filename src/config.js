/**
 * API 配置 (仅供演示 - 请勿在生产环境中使用)
 * 警告：API 密钥已暴露在此文件中，这在生产环境中是极不安全的！
 * 仅适用于本地演示或明确知晓风险的情况。
 */
export const apiConfig = {
    key: "gemini", // 警告：API 密钥已暴露，仅供演示！
    baseurl: "https://snemc-gemini-balance.hf.space/v1/chat/completions",
    model: "gemini-2.5-flash-preview-04-17", // 重要提示：请确保此模型支持多模态输入！
    system_prompt: "你是一个中文助手，帮助用户回答问题,回答时需要使用中文。如果需要代码，请使用markdown格式输出，并明确指定代码语言类型，例如 ```python ... ```。" // 更新系统提示，鼓励 Markdown 输出并指定语言
};