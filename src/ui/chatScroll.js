// src/ui/chatScroll.js
import { aiResponseArea } from './domElements.js'; // 导入 AI 响应区域元素引用

/**
 * 智能滚动聊天区域到底部。
 * 仅当用户当前滚动位置接近底部时，或者聊天内容未填满可视区域时，才自动滚动。
 * 这避免了在用户向上滚动查看历史消息时，新消息到达导致视窗跳到底部的不良体验。
 */
export function scrollChatToBottom() {
    if (!aiResponseArea) {
        console.warn("[UI] scrollChatToBottom: aiResponseArea 元素引用为 null。");
        return;
    }

    const scrollThreshold = 150; // 定义“接近底部”的阈值（像素）
    const currentScroll = aiResponseArea.scrollTop; // 当前滚动条距离顶部的距离
    const clientHeight = aiResponseArea.clientHeight; // 可视区域的高度
    const scrollHeight = aiResponseArea.scrollHeight; // 内容的总高度

    // 在 DOM 更新前检查用户是否接近底部
    // (scrollHeight - clientHeight) 是可滚动的总高度（即滚动条可以移动的最大距离）
    // (scrollHeight - clientHeight - currentScroll) 是当前滚动位置距离最底部的距离
    const isNearBottom = scrollHeight - currentScroll - clientHeight <= scrollThreshold;

    // 使用 setTimeout 将滚动操作推迟到当前 JavaScript 执行堆栈清空之后执行。
    // 这确保了在计算新的 scrollHeight 和执行滚动之前，浏览器有时间完成由新消息引起的 DOM 更新和重新渲染。
    setTimeout(() => {
        // 重新获取最新的 scrollHeight，因为内容可能刚刚被添加或更新
        const newScrollHeight = aiResponseArea.scrollHeight;

        // 如果用户在添加新内容之前就接近底部，或者内容区本身就没有滚动条（内容不足以填满可视区），则滚动到底部
        if (isNearBottom || newScrollHeight <= clientHeight) {
             aiResponseArea.scrollTop = newScrollHeight; // 直接设置 scrollTop 为最大值即可滚动到底部
        }
        // 否则 (isNearBottom 为 false)，不执行任何操作，保持用户当前的滚动位置，让他们可以继续阅读历史消息。
    }, 0); // timeout 为 0 会将回调函数放入事件队列的末尾，在浏览器完成当前任务（包括渲染）后执行。
}