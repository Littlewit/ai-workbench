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
  localStorage.setItem('chat-panel-history', JSON.stringify(val));
}, { deep: true });

// 初始化读取 localStorage 中的聊天记录
list.value = JSON.parse(localStorage.getItem('chat-panel-history') || '[]'); 

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
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: list.value.slice(0, -1) })
    });

    // console.log('响应状态:', res.status);
    // console.log('响应头:', res.headers);

    const reader = res.body?.getReader();
    const dec = new TextDecoder();
    
    if (!reader) {
      console.error('无法获取响应流');
      ai.content = '无法获取响应流';
      loading.value = false;
      return;
    }

    let fullResponse = '';
    while (1) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = dec.decode(value);
      fullResponse += chunk;
      // console.log('接收到的 chunk:', chunk);
    }

    // console.log('完整响应:', fullResponse);
    
    // 尝试解析完整响应
    try {
      const j = JSON.parse(fullResponse);
      // console.log('解析到的 JSON:', j);
      
      // 尝试不同的返回格式
      if (j.output?.choices?.[0]?.message?.content) {
        ai.content = j.output.choices[0].message.content;
        // console.log('提取到内容 1:', ai.content);
      } else if (j.content) {
        ai.content = j.content;
        // console.log('提取到内容 2:', ai.content);
      } else if (j.message) {
        ai.content = j.message;
        // console.log('提取到内容 3:', ai.content);
      } else if (j.result) {
        ai.content = j.result;
        // console.log('提取到内容 4:', ai.content);
      } else {
        // 尝试按 SSE 格式解析
        const lines = fullResponse.split('\n');
        // console.log('按行分割:', lines);
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              const json = JSON.parse(data);
              // console.log('解析到的 SSE JSON:', json);
              
              if (json.output?.choices?.[0]?.message?.content) {
                ai.content += json.output.choices[0].message.content;
                // console.log('提取到 SSE 内容:', json.output.choices[0].message.content);
              }
            } catch (e) {
              console.error('解析 SSE 数据失败:', e);
            }
          }
        }
      }
      // 保存当前聊天记录到 localStorage
      localStorage.setItem('chat-panel-history', JSON.stringify(list.value));
    } catch (e) {
      console.error('解析完整响应失败:', e);
      ai.content = '解析响应数据失败';
    }
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
  localStorage.setItem('chat-panel-history', JSON.stringify(list.value));
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