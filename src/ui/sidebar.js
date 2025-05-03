// src/ui/sidebar.js
import {
    sessionListElement,
    chatTitleElement,
    sidebarToggleBtn,
    appContainer,
    sidebarOverlay
} from './domElements.js'; // 导入侧边栏相关 DOM 元素

/**
 * 在侧边栏中渲染会话列表。
 * @param {Array<object>} sessions - 会话对象数组 (例如 [{id, name}, ...])。
 * @param {string|null} activeSessionId - 当前活动会话的 ID。
 */
export function renderSessionList(sessions, activeSessionId) {
    if (!sessionListElement) {
        console.error("UI 错误：未找到或未初始化会话列表元素 (#session-list)。");
        return;
    }

    // 清空当前列表项
    sessionListElement.innerHTML = '';

    if (!sessions || sessions.length === 0) {
        // 如果没有会话，显示占位符
        const noSessionsLi = document.createElement('li');
        noSessionsLi.className = 'placeholder-text';
        noSessionsLi.textContent = '没有会话。点击下方按钮创建。';
        sessionListElement.appendChild(noSessionsLi);
        return;
    }

    // 添加新的列表项
    sessions.forEach(session => {
        const li = document.createElement('li');
        li.textContent = session.name || `会话 ${session.id.substring(0, 4)}`; // 回退名称
        li.setAttribute('data-session-id', session.id);
        li.title = session.name || `会话 ${session.id}`; // 悬停时显示完整名称或 ID

        // 标记活动会话
        if (session.id === activeSessionId) {
            li.classList.add('active-session');
        }

        // 添加控件容器（用于编辑和删除按钮）
        const controls = document.createElement('span');
        controls.className = 'session-controls'; // 用于样式控制

        // 创建编辑按钮
        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'session-control-button session-edit-btn'; // 通用和特定类
        editButton.title = '编辑会话';
        editButton.textContent = '✏️'; // 编辑图标
        editButton.dataset.sessionId = session.id; // 将会话 ID 存储在按钮上，方便事件处理
        controls.appendChild(editButton);

        // 仅当存在多个会话时才添加删除按钮
        if (sessions.length > 1) {
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button'; // 明确类型
            deleteBtn.className = 'session-control-button session-delete-btn'; // 通用和特定类
            deleteBtn.textContent = '🗑️'; // 删除图标
            deleteBtn.title = '删除会话';
            deleteBtn.dataset.sessionId = session.id; // 同样存储 ID
            controls.appendChild(deleteBtn);
        }

        // 将控件容器添加到列表项
        li.appendChild(controls);

        // 将列表项添加到会话列表
        sessionListElement.appendChild(li);
    });
}

/**
 * 更新聊天区域顶部的标题文本。
 * @param {string} title - 要显示的新标题。
 */
export function updateChatTitle(title) {
    if (chatTitleElement) {
        chatTitleElement.textContent = title;
    } else {
        console.warn("UI: updateChatTitle 调用时 chatTitleElement 未初始化。");
    }
}


/**
 * 初始化侧边栏切换功能。
 * 添加事件监听器以处理按钮点击和遮罩层点击。
 */
export function initializeSidebar() {
    if (sidebarToggleBtn && appContainer && sidebarOverlay) {
        // 切换按钮点击事件
        sidebarToggleBtn.addEventListener('click', () => {
            appContainer.classList.toggle('sidebar-open'); // 切换主容器的类
        });

        // 遮罩层点击事件（用于关闭侧边栏）
        sidebarOverlay.addEventListener('click', () => {
             appContainer.classList.remove('sidebar-open'); // 移除类以关闭侧边栏
        });
        console.log("侧边栏切换功能已初始化。");
    } else {
        // 这个警告理论上不应再触发，因为 initializeElements 已经检查过这些元素
        console.warn("侧边栏切换元素缺失，功能禁用。");
    }
}