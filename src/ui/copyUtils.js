// src/ui/copyUtils.js

/**
 * 尝试使用已弃用的 execCommand 方法将文本复制到剪贴板。
 * 这是作为 navigator.clipboard API 不可用时的后备方案。
 * @param {string} text 要复制的文本。
 * @returns {boolean} 如果复制命令可能成功，则返回 true，否则返回 false。
 */
export function copyTextFallback(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // 将 textarea 移到屏幕外。
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    // 避免潜在的滚动问题
    textArea.style.opacity = '0';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    let success = false;
    try {
        // execCommand 可能会抛出错误或返回 false
        success = document.execCommand('copy');
        if (!success) {
            console.warn('后备复制命令 (execCommand) 报告失败。');
        }
    } catch (err) {
        console.error('使用后备复制命令 (execCommand) 时出错:', err);
        success = false;
    }

    document.body.removeChild(textArea);
    return success;
}