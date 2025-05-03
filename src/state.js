import { apiConfig } from './config.js';

const SESSIONS_STORAGE_KEY = 'chatAppSessions';
const ACTIVE_SESSION_ID_STORAGE_KEY = 'chatAppActiveSessionId';

let sessions = {}; // 存储所有会话: sessionId -> { id, name, messages }
let activeSessionId = null; // 当前活动会话的 ID

/** 辅助函数：生成唯一的会话 ID */
function generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(16).substring(2, 8)}`;
}

/** 辅助函数：将当前状态保存到 localStorage */
function _saveState() {
    try {
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
        if (activeSessionId) {
            localStorage.setItem(ACTIVE_SESSION_ID_STORAGE_KEY, activeSessionId);
        } else {
            // 如果没有活动会话ID（例如，所有会话都被删除了），则移除该键
            localStorage.removeItem(ACTIVE_SESSION_ID_STORAGE_KEY);
        }
    } catch (error) {
        console.error("保存状态到 localStorage 时出错:", error);
        // 考虑更健壮的错误处理，例如通知用户
    }
}

/** 辅助函数：从 localStorage 加载状态 */
function _loadState() {
    try {
        const storedSessions = localStorage.getItem(SESSIONS_STORAGE_KEY);
        const storedActiveId = localStorage.getItem(ACTIVE_SESSION_ID_STORAGE_KEY);

        sessions = storedSessions ? JSON.parse(storedSessions) : {};

        // 基本验证和修复：确保 messages 是数组
        Object.values(sessions).forEach(session => {
            if (!session || !Array.isArray(session.messages)) {
                console.warn(`会话 ${session?.id} 的消息格式无效或会话数据损坏。正在重置消息...`);
                // 如果会话本身无效或消息不是数组，则重置消息
                if (session) {
                     session.messages = [{ role: 'system', content: apiConfig.system_prompt }];
                } else {
                    // 如果会话对象本身损坏，可能需要移除该会话，但这比较复杂，暂时只重置消息
                    // delete sessions[sessionId]; // 需要 sessionId
                }
            }
            // 确保至少有一个 system 消息
            if (!session.messages.some(m => m.role === 'system')) {
                 console.warn(`会话 ${session.id} 缺少系统提示。正在添加默认提示...`);
                 session.messages.unshift({ role: 'system', content: apiConfig.system_prompt });
            }
        });


        const sessionIds = Object.keys(sessions);
        if (storedActiveId && sessions[storedActiveId]) {
            // 如果存储的活动 ID 有效，则使用它
            activeSessionId = storedActiveId;
        } else if (sessionIds.length > 0) {
            // 否则，如果存在任何会话，则默认使用第一个会话
            activeSessionId = sessionIds[0];
        } else {
            // 如果没有会话，则活动 ID 为 null
            activeSessionId = null;
        }

    } catch (error) {
        console.error("从 localStorage 加载状态时出错:", error);
        // 加载出错时，重置为初始状态
        sessions = {};
        activeSessionId = null;
    }
}

/** 如果没有会话，则创建默认会话 */
function _createDefaultSession() {
    const defaultId = generateSessionId();
    const defaultName = "默认聊天";
    sessions[defaultId] = {
        id: defaultId,
        name: defaultName,
        messages: [{ role: 'system', content: apiConfig.system_prompt }]
    };
    activeSessionId = defaultId; // 将新创建的设为活动会话
    console.log("创建了默认会话:", defaultId);
}

/**
 * 初始化状态模块。
 * 从 localStorage 加载状态，如果为空则创建默认会话。
 */
export function initializeState() {
    _loadState();
    if (Object.keys(sessions).length === 0) {
        _createDefaultSession();
        _saveState(); // 保存包含默认会话的状态
    }
    console.log("状态已初始化。当前活动会话:", activeSessionId);
    // console.log("所有会话:", sessions); // 调试用
}

/**
 * 获取所有会话对象的数组。
 * @returns {Array<object>} 会话对象数组。
 */
export function getAllSessions() {
    // 可以考虑按名称或创建时间排序
    return Object.values(sessions).sort((a, b) => (a.name || "").localeCompare(b.name || "")); // 按名称排序
}

/**
 * 根据 ID 获取单个会话对象。
 * @param {string} sessionId - 要获取的会话 ID。
 * @returns {object|null} 会话对象或 null（如果未找到）。
 */
export function getSession(sessionId) {
    return sessions[sessionId] || null;
}

/**
 * 获取当前活动会话的 ID。
 * @returns {string|null} 活动会话 ID 或 null。
 */
export function getActiveSessionId() {
    return activeSessionId;
}

/**
 * 设置活动会话 ID。
 * @param {string} sessionId - 要设置为活动的会话 ID。
 * @returns {boolean} 如果设置成功则返回 true，否则返回 false。
 */
export function setActiveSessionId(sessionId) {
    if (sessions[sessionId]) {
        activeSessionId = sessionId;
        _saveState();
        console.log("活动会话已设置为:", activeSessionId);
        return true;
    }
    console.warn("尝试将活动会话设置为不存在的 ID:", sessionId);
    return false;
}

/**
 * 添加一个新会话。
 * @param {string} [name] - 新会话的名称（可选，默认为 "新会话 X"）。
 * @returns {string} 新创建会话的 ID。
 */
export function addSession(name = null) {
    const newId = generateSessionId();
    const sessionCount = Object.keys(sessions).length;
    const newName = name || `新会话 ${sessionCount + 1}`;
    sessions[newId] = {
        id: newId,
        name: newName.trim(),
        messages: [{ role: 'system', content: apiConfig.system_prompt }]
    };
    _saveState();
    console.log("添加了新会话:", newId, newName);
    return newId;
}

/**
 * 根据 ID 删除一个会话。
 * @param {string} sessionId - 要删除的会话 ID。
 * @returns {boolean} 如果删除成功则返回 true。
 */
export function deleteSession(sessionId) {
    if (!sessions[sessionId]) {
        console.warn("尝试删除不存在的会话:", sessionId);
        return false;
    }
    // 移除不允许删除最后一个会话的限制
    // if (Object.keys(sessions).length <= 1) {
    //     console.warn("无法删除最后一个会话。");
    //     alert("无法删除最后一个会话。"); // 用户提示
    //     return false;
    // }

    const deletedSessionName = sessions[sessionId].name; // 用于日志
    delete sessions[sessionId]; // 直接删除
    console.log("删除了会话:", sessionId, deletedSessionName);

    // 如果删除的是活动会话，则切换到另一个会话（例如第一个）
    if (activeSessionId === sessionId) {
        const remainingIds = Object.keys(sessions);
        activeSessionId = remainingIds[0] || null; // 如果都删完了则为 null
        console.log("活动会话已切换到:", activeSessionId);
    }
    _saveState();
    return true;
}

/**
 * 更新会话名称。
 * @param {string} sessionId - 要更新的会话 ID。
 * @param {string} newName - 新的会话名称。
 * @returns {boolean} 如果更新成功则返回 true。
 */
export function updateSessionName(sessionId, newName) {
    if (sessions[sessionId] && newName && typeof newName === 'string') {
        const trimmedName = newName.trim();
        if (trimmedName) { // 不允许空名称
            sessions[sessionId].name = trimmedName;
            _saveState();
            console.log(`会话 ${sessionId} 名称已更新为:`, trimmedName);
            return true;
        }
    }
    console.warn("更新会话名称失败:", sessionId, newName);
    return false;
}

/**
 * 更新会话的系统提示。
 * @param {string} sessionId - 要更新的会话 ID。
 * @param {string} newPrompt - 新的系统提示内容。
 * @returns {boolean} 如果更新成功则返回 true。
 */
export function updateSystemPrompt(sessionId, newPrompt) {
     if (sessions[sessionId] && typeof newPrompt === 'string') {
        const systemMessage = sessions[sessionId].messages.find(msg => msg.role === 'system');
        if (systemMessage) {
            systemMessage.content = newPrompt; // 直接更新找到的第一个系统消息
        } else {
            // 如果没有系统消息，则在开头添加一个
            sessions[sessionId].messages.unshift({ role: 'system', content: newPrompt });
            console.warn(`会话 ${sessionId} 缺少系统提示，已在开头添加。`);
        }
        _saveState();
        console.log(`会话 ${sessionId} 的系统提示已更新。`);
        return true;
    }
    console.warn("更新系统提示失败:", sessionId, newPrompt);
    return false;
}

/**
 * 向指定 ID 的会话添加一条消息。
 * @param {string} sessionId - 目标会话 ID。
 * @param {string} role - 消息角色 ('user' 或 'assistant')。
 * @param {string | Array<object>} content - 消息内容。
 * @returns {boolean} 如果添加成功则返回 true。
 */
export function addMessageToSession(sessionId, role, content) {
    if (!sessions[sessionId]) {
        console.error(`无法向不存在的会话 ${sessionId} 添加消息。`);
        return false;
    }
    if (!role || !content) {
        console.error("无法添加空角色或空内容的消息。");
        return false;
    }
    sessions[sessionId].messages.push({ role, content });
    _saveState();
    return true;
}

/**
 * 从指定会话中按索引删除一条消息。
 * @param {string} sessionId - 目标会话 ID。
 * @param {number} messageIndex - 要删除的消息在 messages 数组中的索引。
 * @returns {boolean} 如果删除成功则返回 true。
 */
export function deleteMessageFromSession(sessionId, messageIndex) {
    if (!sessions[sessionId]) {
        console.error(`无法从不存在的会话 ${sessionId} 删除消息。`);
        return false;
    }
    const messages = sessions[sessionId].messages;
    if (messageIndex < 0 || messageIndex >= messages.length) {
        console.error(`尝试从会话 ${sessionId} 删除无效索引 ${messageIndex} 的消息。`);
        return false;
    }
    // 再次检查 messageIndex 是否仍然有效，以防在边界检查后状态发生变化
    const messageToDelete = messages[messageIndex];
    if (!messageToDelete) {
        console.error(`尝试删除会话 ${sessionId} 索引 ${messageIndex} 时消息已不存在。可能存在竞态条件。`);
        alert("无法删除消息，它可能已被其他操作移除。");
        return false;
    }
    // 不允许删除 system 消息 (通常是第一个)
    if (messageToDelete.role === 'system') {
        console.warn(`不允许删除会话 ${sessionId} 中的系统消息 (索引 ${messageIndex})。`);
        alert("无法删除系统提示消息。");
        return false;
    }

    const deletedMessage = messages.splice(messageIndex, 1); // 从数组中移除
    console.log(`从会话 ${sessionId} 删除了索引 ${messageIndex} 的消息:`, deletedMessage[0]);
    _saveState();
    return true;
}

/**
 * 更新指定会话中特定索引的消息内容。
 * @param {string} sessionId - 目标会话 ID。
 * @param {number} messageIndex - 要更新的消息在 messages 数组中的索引。
 * @param {string | Array<object>} newContent - 新的消息内容。
 * @returns {boolean} 如果更新成功则返回 true。
 */
export function updateMessageInSession(sessionId, messageIndex, newContent) {
    if (!sessions[sessionId]) {
        console.error(`无法更新不存在的会话 ${sessionId} 中的消息。`);
        return false;
    }
    const messages = sessions[sessionId].messages;
    if (messageIndex < 0 || messageIndex >= messages.length) {
        console.error(`尝试更新会话 ${sessionId} 中无效索引 ${messageIndex} 的消息。`);
        return false;
    }
    // 通常不应允许直接编辑 system 消息，但如果需要可以放开
    if (messages[messageIndex].role === 'system') {
         console.warn(`不建议直接编辑会话 ${sessionId} 中的系统消息 (索引 ${messageIndex})。请使用 updateSystemPrompt。`);
         // return false; // 可以选择阻止编辑
    }
    if (typeof newContent === 'undefined') {
         console.error(`尝试将会话 ${sessionId} 索引 ${messageIndex} 的消息更新为 undefined 内容。`);
         return false;
    }

    console.log(`更新会话 ${sessionId} 索引 ${messageIndex} 的消息内容。旧内容:`, messages[messageIndex].content, "新内容:", newContent);
    messages[messageIndex].content = newContent;
    _saveState();
    return true;
}


/**
 * 获取指定 ID 会话的消息数组。
 * @param {string} sessionId - 目标会话 ID。
 * @returns {Array<object>} 消息数组的副本，如果会话不存在则返回空数组。
 */
export function getMessages(sessionId) {
    if (!sessions[sessionId]) {
        console.warn(`尝试获取不存在的会话 ${sessionId} 的消息。`);
        return [];
    }
    // 返回副本以防止外部修改
    return [...sessions[sessionId].messages];
}

/**
 * 获取当前活动会话的消息数组。
 * @returns {Array<object>} 活动会话消息数组的副本，如果没有活动会话则返回包含默认系统提示的数组。
 */
export function getActiveSessionMessages() {
    if (!activeSessionId || !sessions[activeSessionId]) {
        console.warn("没有活动的会话或会话数据未找到。返回默认提示。");
        // 返回包含默认系统提示的基本结构，以避免下游代码出错
        return [{ role: 'system', content: apiConfig.system_prompt }];
    }
    return [...sessions[activeSessionId].messages]; // 返回副本
}


// 在模块加载时自动初始化状态
initializeState();