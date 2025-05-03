// src/ui/editModal.js
import {
    editModalOverlay,
    editModalNameInput,
    editModalPromptTextarea,
    editModalForm,
    editModalCancelBtn
} from './domElements.js'; // 导入模态框相关 DOM 元素

/**
 * 显示编辑会话模态框。
 */
export function showEditModal() {
    if (editModalOverlay) {
        editModalOverlay.classList.add('visible'); // 添加 'visible' 类以显示
        // 可选：自动聚焦到第一个输入框
        editModalNameInput?.focus();
    } else {
        console.error("UI 错误：无法显示编辑模态框，遮罩层元素未找到。");
    }
}

/**
 * 隐藏编辑会话模态框。
 */
export function hideEditModal() {
     if (editModalOverlay) {
        editModalOverlay.classList.remove('visible'); // 移除 'visible' 类以隐藏
    } else {
        console.error("UI 错误：无法隐藏编辑模态框，遮罩层元素未找到。");
    }
}

/**
 * 设置编辑模态框输入框的初始值。
 * @param {string} name - 当前会话名称。
 * @param {string} prompt - 当前系统提示。
 */
export function setEditModalValues(name, prompt) {
    if (editModalNameInput) {
        editModalNameInput.value = name;
    } else {
         console.warn("UI: setEditModalValues - 名称输入框未找到。");
    }
    if (editModalPromptTextarea) {
        editModalPromptTextarea.value = prompt;
    } else {
         console.warn("UI: setEditModalValues - 提示文本区域未找到。");
    }
}

/**
 * 获取编辑模态框输入框的当前值。
 * @returns {{name: string, prompt: string}|null} 包含名称和提示的对象，如果元素未找到则返回 null。
 */
export function getEditModalValues() {
    if (editModalNameInput && editModalPromptTextarea) {
        return {
            name: editModalNameInput.value.trim(), // 去除名称的首尾空格
            prompt: editModalPromptTextarea.value
        };
    }
    console.error("UI 错误：无法获取模态框值，输入元素未找到。");
    return null;
}

/**
 * 获取对模态框表单和取消按钮的引用，用于附加/分离监听器。
 * @returns {{form: HTMLFormElement, cancelBtn: HTMLButtonElement}|null} 包含表单和按钮引用的对象，或在未找到时返回 null。
 */
export function getEditModalFormElements() {
    if (editModalForm && editModalCancelBtn) {
        return { form: editModalForm, cancelBtn: editModalCancelBtn };
    }
    console.error("UI 错误：无法获取模态框表单元素。");
    return null;
}