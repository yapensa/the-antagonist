const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");
const intensityInput = document.getElementById("intensity");
const intensityVal = document.getElementById("intensity-val");
const intensityLabel = document.getElementById("intensity-label");
const resetBtn = document.getElementById("reset-btn");
const fileInput = document.getElementById("file-upload");
const previewBar = document.getElementById("file-preview-container");
const previewContent = document.getElementById("preview-content");
const clearFilesBtn = document.getElementById("clear-files");

let conversation = [];
let attachedFiles = [];
let isProcessing = false;

// 1. Level Skeptisisme Logic
const metaLevels = [
  { max: 3, label: "Pragmatis", color: "#94a3b8" },
  { max: 6, label: "Skeptis", color: "#3b82f6" },
  { max: 8, label: "Sangat Kritis", color: "#ff3344" },
  { max: 10, label: "Brutal / Penghancur", color: "#ff0000" }
];

intensityInput.addEventListener('input', (e) => {
  const val = parseInt(e.target.value);
  const meta = metaLevels.find(m => val <= m.max);
  
  intensityVal.textContent = val;
  intensityLabel.textContent = meta.label;
  intensityLabel.style.color = meta.color;
  intensityVal.style.color = meta.color;
});

// 2. File Handling & Preview
fileInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  previewBar.classList.remove('hidden');
  
  for (const file of files) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target.result.split(',')[1];
      attachedFiles.push({
        name: file.name,
        mimeType: file.type,
        data: base64Data
      });

      const chip = document.createElement('div');
      chip.className = 'file-chip';
      chip.innerHTML = `<i data-lucide="file" style="width:14px"></i><span>${file.name}</span>`;
      previewContent.appendChild(chip);
      if(window.lucide) window.lucide.createIcons();
    };
    reader.readAsDataURL(file);
  }
});

clearFilesBtn.onclick = () => {
  attachedFiles = [];
  previewContent.innerHTML = '';
  previewBar.classList.add('hidden');
  fileInput.value = '';
};

// 3. Chat Mechanics
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (isProcessing) return;

  const text = input.value.trim();
  if (!text && attachedFiles.length === 0) return;

  isProcessing = true;
  const currentFiles = [...attachedFiles];
  
  // Tampilkan di UI
  appendMessage("user", text, currentFiles);
  
  // Reset UI Input
  input.value = "";
  input.style.height = "auto";
  clearFilesBtn.click();

  // Tambahkan ke Log Konteks
  conversation.push({ role: "user", text: text });

  const loading = showLoading();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation,
        intensity: intensityInput.value,
        attachments: currentFiles
      })
    });

    const data = await response.json();
    chatBox.removeChild(loading);

    if (data.error) throw new Error(data.error);

    appendMessage("model", data.result);
    conversation.push({ role: "model", text: data.result });

  } catch (err) {
    if (chatBox.contains(loading)) chatBox.removeChild(loading);
    appendMessage("model", "SYSTEM_FAILURE: Hubungan terputus. " + err.message);
  } finally {
    isProcessing = false;
    scrollToBottom();
  }
});

function appendMessage(sender, text, files = []) {
  const wrapper = document.createElement("div");
  wrapper.className = `message-wrapper ${sender}`;
  
  const bubble = document.createElement("div");
  bubble.className = `message ${sender}`;
  
  let html = '';
  
  // Render tag file jika ada
  if (files.length > 0) {
    html += `<div class="msg-files">`;
    files.forEach(f => {
      html += `<div class="msg-file-tag"><i data-lucide="paperclip" style="width:10px"></i>${f.name}</div>`;
    });
    html += `</div>`;
  }
  
  html += `<div class="text-content">${parseMarkdown(text)}</div>`;
  bubble.innerHTML = html;
  
  wrapper.appendChild(bubble);
  chatBox.appendChild(wrapper);
  
  if (window.lucide) window.lucide.createIcons();
  scrollToBottom();
}

function parseMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/\n/g, '<br>');
}

function showLoading() {
  const el = document.createElement("div");
  el.className = "message-wrapper model";
  el.innerHTML = `<div class="message model" style="display:flex; gap:5px; padding: 15px 20px;">
    <span class="pulse" style="animation-delay:0s"></span>
    <span class="pulse" style="animation-delay:0.2s"></span>
    <span class="pulse" style="animation-delay:0.4s"></span>
  </div>`;
  chatBox.appendChild(el);
  scrollToBottom();
  return el;
}

function scrollToBottom() {
  chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
}

input.oninput = function() {
  this.style.height = 'auto';
  this.style.height = (this.scrollHeight) + 'px';
};

resetBtn.onclick = () => {
  if (confirm("Hapus seluruh sejarah audit ini?")) location.reload();
};