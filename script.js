// script.js

// EDITABLE SYSTEM PROMPT
const SYSTEM_PROMPT = "You are Apex AI. Ultra-intelligent, strategic, concise, confident, futuristic. Provide structured and clearly formatted responses. Avoid unnecessary fluff.";

// STATE
let chatHistory = [];
let isGenerating = false;
let currentController = null;

// DOM ELEMENTS
const chatContainer = document.getElementById('chatContainer');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const stopBtn = document.getElementById('stopBtn');
const newChatBtn = document.getElementById('newChatBtn');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');
const themeToggle = document.getElementById('themeToggle');
const soundToggle = document.getElementById('soundToggle');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');
const messageCount = document.getElementById('messageCount');
const tokenCount = document.getElementById('tokenCount');
const charCount = document.getElementById('charCount');

// INIT
loadChatHistory();
updateStats();
autoResizeTextarea();

// EVENT LISTENERS
sendBtn.addEventListener('click', sendMessage);
stopBtn.addEventListener('click', stopGeneration);
newChatBtn.addEventListener('click', newChat);
clearBtn.addEventListener('click', clearChat);
exportBtn.addEventListener('click', exportChat);
themeToggle.addEventListener('change', toggleTheme);
sidebarToggle.addEventListener('click', toggleSidebar);

userInput.addEventListener('input', () => {
    autoResizeTextarea();
    updateCharCount();
});

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// FUNCTIONS
function autoResizeTextarea() {
    userInput.style.height = 'auto';
    userInput.style.height = userInput.scrollHeight + 'px';
}

function updateCharCount() {
    const count = userInput.value.length;
    charCount.textContent = count;
    if (count > 2000) {
        userInput.value = userInput.value.substring(0, 2000);
        charCount.textContent = 2000;
    }
}

function updateStats() {
    messageCount.textContent = chatHistory.length;
    const estimatedTokens = chatHistory.reduce((acc, msg) => {
        return acc + Math.ceil(msg.content.length / 4);
    }, 0);
    tokenCount.textContent = estimatedTokens;
}

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message || isGenerating) return;

    addMessage('user', message);
    userInput.value = '';
    autoResizeTextarea();
    updateCharCount();

    isGenerating = true;
    sendBtn.disabled = true;
    stopBtn.style.display = 'block';
    sendBtn.style.display = 'none';

    const typingId = showTypingIndicator();

    try {
        const context = chatHistory.slice(-10).map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        const response = await puter.ai.chat([
            { role: 'system', content: SYSTEM_PROMPT },
            ...context,
            { role: 'user', content: message }
        ]);

        removeTypingIndicator(typingId);

        if (response && response.message && response.message.content) {
            await simulateTyping(response.message.content);
        } else {
            addMessage('assistant', 'I apologize, but I encountered an error generating a response.');
        }
    } catch (error) {
        removeTypingIndicator(typingId);
        addMessage('assistant', `Error: ${error.message}`);
    } finally {
        isGenerating = false;
        sendBtn.disabled = false;
        stopBtn.style.display = 'none';
        sendBtn.style.display = 'flex';
    }
}

function stopGeneration() {
    if (currentController) {
        currentController.abort();
        currentController = null;
    }
    isGenerating = false;
    sendBtn.disabled = false;
    stopBtn.style.display = 'none';
    sendBtn.style.display = 'flex';
}

function addMessage(role, content) {
    chatHistory.push({ role, content, timestamp: Date.now() });
    saveChatHistory();
    updateStats();

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? 'U' : 'AI';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    if (role === 'assistant') {
        contentDiv.innerHTML = marked.parse(content);
        addCodeCopyButtons(contentDiv);

        const actions = document.createElement('div');
        actions.className = 'message-actions';
        actions.innerHTML = `
            <button class="action-btn copy-msg-btn">Copy</button>
            <button class="action-btn regen-btn">Regenerate</button>
        `;
        contentDiv.appendChild(actions);

        actions.querySelector('.copy-msg-btn').addEventListener('click', () => {
            copyToClipboard(content);
        });

        actions.querySelector('.regen-btn').addEventListener('click', () => {
            regenerateResponse();
        });
    } else {
        contentDiv.textContent = content;
    }

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    chatContainer.appendChild(messageDiv);

    scrollToBottom();
}

async function simulateTyping(content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = 'AI';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    chatContainer.appendChild(messageDiv);

    let displayed = '';
    const speed = 10;

    for (let i = 0; i < content.length; i++) {
        if (!isGenerating) break;
        displayed += content[i];
        contentDiv.innerHTML = marked.parse(displayed);
        if (i % 10 === 0) scrollToBottom();
        await sleep(speed);
    }

    contentDiv.innerHTML = marked.parse(content);
    addCodeCopyButtons(contentDiv);

    const actions = document.createElement('div');
    actions.className = 'message-actions';
    actions.innerHTML = `
        <button class="action-btn copy-msg-btn">Copy</button>
        <button class="action-btn regen-btn">Regenerate</button>
    `;
    contentDiv.appendChild(actions);

    actions.querySelector('.copy-msg-btn').addEventListener('click', () => {
        copyToClipboard(content);
    });

    actions.querySelector('.regen-btn').addEventListener('click', () => {
        regenerateResponse();
    });

    chatHistory.push({ role: 'assistant', content, timestamp: Date.now() });
    saveChatHistory();
    updateStats();
}

function addCodeCopyButtons(container) {
    const codeBlocks = container.querySelectorAll('pre code');
    codeBlocks.forEach(block => {
        const pre = block.parentElement;
        const wrapper = document.createElement('div');
        wrapper.className = 'code-wrapper';

        const header = document.createElement('div');
        header.className = 'code-header';

        const lang = document.createElement('span');
        lang.className = 'code-lang';
        lang.textContent = block.className.replace('language-', '') || 'code';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-code-btn';
        copyBtn.textContent = 'Copy';
        copyBtn.addEventListener('click', () => {
            copyToClipboard(block.textContent);
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = 'Copy', 2000);
        });

        header.appendChild(lang);
        header.appendChild(copyBtn);

        pre.parentNode.insertBefore(header, pre);
    });
}

function showTypingIndicator() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    messageDiv.id = 'typing-indicator';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = 'AI';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const typing = document.createElement('div');
    typing.className = 'typing-indicator';
    typing.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';

    contentDiv.appendChild(typing);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    chatContainer.appendChild(messageDiv);

    scrollToBottom();
    return 'typing-indicator';
}

function removeTypingIndicator(id) {
    const indicator = document.getElementById(id);
    if (indicator) indicator.remove();
}

function regenerateResponse() {
    if (chatHistory.length < 2) return;
    chatHistory.pop();
    const lastUserMessage = chatHistory[chatHistory.length - 1];
    if (lastUserMessage.role === 'user') {
        chatHistory.pop();
        userInput.value = lastUserMessage.content;
        renderChatHistory();
        sendMessage();
    }
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        console.log('Copied to clipboard');
    });
}

function newChat() {
    chatHistory = [];
    saveChatHistory();
    renderChatHistory();
    updateStats();
}

function clearChat() {
    if (confirm('Clear all chat history?')) {
        chatHistory = [];
        saveChatHistory();
        renderChatHistory();
        updateStats();
    }
}

function exportChat() {
    const text = chatHistory.map(msg => {
        return `${msg.role.toUpperCase()}: ${msg.content}\n`;
    }).join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apex-ai-chat-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
}

function toggleSidebar() {
    sidebar.classList.toggle('hidden');
}

function saveChatHistory() {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

function loadChatHistory() {
    const saved = localStorage.getItem('chatHistory');
    if (saved) {
        chatHistory = JSON.parse(saved);
        renderChatHistory();
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        themeToggle.checked = true;
    }
}

function renderChatHistory() {
    chatContainer.innerHTML = '';
    chatHistory.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.role}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = msg.role === 'user' ? 'U' : 'AI';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        if (msg.role === 'assistant') {
            contentDiv.innerHTML = marked.parse(msg.content);
            addCodeCopyButtons(contentDiv);

            const actions = document.createElement('div');
            actions.className = 'message-actions';
            actions.innerHTML = `
                <button class="action-btn copy-msg-btn">Copy</button>
                <button class="action-btn regen-btn">Regenerate</button>
            `;
            contentDiv.appendChild(actions);

            actions.querySelector('.copy-msg-btn').addEventListener('click', () => {
                copyToClipboard(msg.content);
            });

            actions.querySelector('.regen-btn').addEventListener('click', () => {
                regenerateResponse();
            });
        } else {
            contentDiv.textContent = msg.content;
        }

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);
        chatContainer.appendChild(messageDiv);
    });

    scrollToBottom();
}
