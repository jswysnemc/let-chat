// src/ui/loadingIndicator.js
import { loadingIndicator } from './domElements.js'; // 导入加载指示器元素引用

/**
 * 显示加载指示器。
 */
export function showLoading() {
    // 不再显示加载指示器
    // if (loadingIndicator) {
    //     loadingIndicator.style.display = 'inline-block'; // 设置为内联块以显示
    // } else {
    //     console.warn("[UI] showLoading: loadingIndicator 元素引用为 null。");
    // }
    return; // 直接返回，不执行任何操作
}

/**
 * 隐藏加载指示器。
 */
export function hideLoading() {
     // console.log("[UI] hideLoading 调用。"); // 调试日志，可以按需启用
     if (loadingIndicator) {
         // console.log("[UI] 隐藏加载指示器元素:", loadingIndicator); // 调试日志
         loadingIndicator.style.display = 'none'; // 设置为 none 以隐藏
     } else {
         console.warn("[UI] hideLoading: loadingIndicator 元素引用为 null。");
     }
}