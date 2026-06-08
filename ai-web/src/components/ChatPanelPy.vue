<!-- 智能聊天面板组件 -->
<template>
  <div class="wrap">
    <div class="history" ref="historyRef">
      <div v-for="(m, i) in list" :key="i" :class="['msg', m.role]">
        <div class="bubble">{{ m.content }}</div>
      </div>
    </div>
    <div class="bar">
      <textarea v-model="input" @keyup.enter="send" placeholder="输入问题..." rows="2" />
      <button @click="send" :disabled="loading">发送</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onBeforeUnmount } from 'vue';
const list = ref([]);
const input = ref('');
const loading = ref(false);
const historyRef = ref(null);

// 监听聊天记录，自动存 localStorage
watch(list, (val) => {
  localStorage.setItem('chat-panel-history-py', JSON.stringify(val));
}, { deep: true });

// 初始化读取 localStorage 中的聊天记录
list.value = JSON.parse(localStorage.getItem('chat-panel-history-py') || '[]');   

const send = async () => {
  const txt = input.value.trim();
  if (!txt || loading.value) return;
  list.value.push({ role: 'user', content: txt });
  input.value = '';
  loading.value = true;

  const ai = { role: 'assistant', content: '' };
  list.value.push(ai);
  await nextTick(() => historyRef.value?.scrollTo(0, 99999));

  try {
    console.log('开始发送请求...');
    const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/ai`;
    console.log('请求URL:', apiUrl);
    
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: list.value.slice(0, -1) })
    });

    console.log('响应状态:', res.status);
    console.log('响应头:', Object.fromEntries(res.headers.entries()));

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    // 尝试解析 JSON
    try {
      const data = await res.json();
      console.log('解析后的JSON:', data);
      
      // 使用返回的 content 字段
      ai.content = data.content || '未收到有效回复';
    } catch (jsonError) {
      console.error('JSON解析错误:', jsonError);
      // 如果 JSON 解析失败，尝试获取文本
      try {
        // 重新获取响应体
        const resClone = res.clone();
        const text = await resClone.text();
        console.log('响应文本:', text);
        ai.content = text || '收到非 JSON 响应';
      } catch (textError) {
        console.error('文本获取错误:', textError);
        ai.content = '无法解析响应';
      }
    }
    
    // 保存当前聊天记录到 localStorage
    localStorage.setItem('chat-panel-history-py', JSON.stringify(list.value));
  } catch (error) {
    console.error('请求失败:', error);
    ai.content = '请求失败: ' + (error instanceof Error ? error.message : String(error));
  } finally {
    loading.value = false;
    await nextTick(() => historyRef.value?.scrollTo(0, 99999));
  }
};

// 组件卸载时，保存当前聊天记录到 localStorage
onBeforeUnmount(() => {
  localStorage.setItem('chat-panel-history-py', JSON.stringify(list.value));
});
</script>

<style scoped>
.wrap {
  display: flex;
	flex-direction: column;
	height: 600px;
}
.history {
  flex: 1;
	padding: 16px;
	overflow-y: auto;
	background-color: #f9fafb;
}
.msg {
  display: flex;
	margin: 8px 0;
}
.msg.user {
  justify-content: flex-end;
}
.bubble {
	max-width: 70%;
	padding: 10px 14px;
	border-radius: 16px;
	background-color: white;
}
.msg.user .bubble {
	background-color: #dbeafe;
}
.bar {
  padding: 12px;
	background-color: white;
  display: flex;
  gap: 8px;
}
textarea {
	flex: 1; padding: 10px;
	border: 1px solid #ddd;
	border-radius: 6px;
}
button {
	padding: 0 16px;
	background: #4f46e5;
	color: white;
	border: none;
	border-radius: 6px;
}
</style>