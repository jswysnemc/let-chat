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
        noSessionsLi.textContent = '没有会话。点击按钮创建。';
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
        // editButton.textContent = '✏️'; // 使用 innerHTML 插入 Font Awesome 图标
        editButton.innerHTML = '<i class="fas fa-pencil-alt"></i>'; // Font Awesome Edit Icon
        editButton.dataset.sessionId = session.id; // 将会话 ID 存储在按钮上，方便事件处理
        controls.appendChild(editButton);

        // 总是添加删除按钮 (移除 if sessions.length > 1 条件)
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button'; // 明确类型
        deleteBtn.className = 'session-control-button session-delete-btn'; // 通用和特定类
        // deleteBtn.textContent = '🗑️'; // 使用 innerHTML 插入 Font Awesome 图标
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>'; // Font Awesome Delete Icon
        deleteBtn.title = '删除会话';
        deleteBtn.dataset.sessionId = session.id; // 同样存储 ID
        controls.appendChild(deleteBtn);
        // } // 移除 if 的结束括号

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
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    
    console.log("侧边栏初始化开始...");
    console.log("sidebar元素:", sidebar);
    console.log("sidebarToggleBtn元素:", sidebarToggleBtn);
    console.log("sidebarOverlay元素:", sidebarOverlay);
    console.log("mainContent元素:", mainContent);
    
    if (sidebarToggleBtn && sidebar && sidebarOverlay && mainContent) {
        console.log("所有必要元素都存在，添加事件监听器");
        
        // 切换按钮点击事件
        sidebarToggleBtn.addEventListener('click', (event) => {
            console.log("侧边栏切换按钮被点击!");
            console.log("事件对象:", event);
            
            // 使用正确的类操作：给sidebar添加open类
            sidebar.classList.add('open');
            console.log("已添加sidebar.open类");
            
            // 显示遮罩层
            sidebarOverlay.classList.add('visible');
            console.log("已添加overlay.visible类");
            
            // 不需要隐藏按钮，这样用户还可以点击其他地方
            // sidebarToggleBtn.style.display = 'none';
        });

        // 关闭侧边栏的函数
        const closeSidebar = () => {
            console.log("关闭侧边栏函数被调用");
            sidebar.classList.remove('open'); // 移除open类以关闭侧边栏
            sidebarOverlay.classList.remove('visible'); // 隐藏遮罩层
            console.log("已移除sidebar.open和overlay.visible类");
        };

        // 遮罩层点击事件（用于关闭侧边栏）
        sidebarOverlay.addEventListener('click', (event) => {
            console.log("遮罩层被点击!");
            closeSidebar();
        });
        
        // 主内容区域点击事件（用于关闭侧边栏）
        // 只有在侧边栏打开时才关闭
        mainContent.addEventListener('click', (event) => {
            console.log("主内容区域被点击!");
            if (sidebar.classList.contains('open')) {
                console.log("侧边栏处于打开状态，现在关闭它");
                closeSidebar();
                // 防止事件冒泡到遮罩层等其他元素
                event.stopPropagation();
            } else {
                console.log("侧边栏未打开，无需关闭");
            }
        });
        
        // 添加调试按钮点击事件，输出元素状态
        console.log("为侧边栏切换按钮添加额外的调试事件");
        
        // 验证按钮是否真的可以点击（CSS z-index, pointer-events等可能会阻止点击）
        sidebarToggleBtn.addEventListener('mouseenter', () => {
            console.log("鼠标进入侧边栏切换按钮");
        });
        
        sidebarToggleBtn.addEventListener('mouseleave', () => {
            console.log("鼠标离开侧边栏切换按钮");
        });
        
        console.log("侧边栏切换功能已初始化。");
    } else {
        // 这个警告理论上不应再触发，因为 initializeElements 已经检查过这些元素
        console.warn("侧边栏切换元素缺失，功能禁用。缺失的元素:");
        if (!sidebarToggleBtn) console.warn("- 侧边栏切换按钮");
        if (!sidebar) console.warn("- 侧边栏");
        if (!sidebarOverlay) console.warn("- 侧边栏遮罩层");
        if (!mainContent) console.warn("- 主内容区域");
    }
}