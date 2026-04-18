<!-- 文档问答（RAG）面板组件 -->
<template>
  <div class="wrap">
    <div class="upload">
      <input type="file" accept=".txt" @change="upload" />
      <span>{{ tip }}</span>
    </div>
    <div class="history" ref="historyRef">
      <div v-for="(m, i) in list" :key="i" :class="['msg', m.role]">
        <div class="bubble">{{ m.content }}</div>
      </div>
    </div>
    <div class="bar">
      <textarea v-model="input" @keyup.enter="send" placeholder="根据文档提问..." rows="2" />
      <button @click="send" :disabled="loading">发送</button>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch, onBeforeUnmount } from 'vue';
const list = ref([]);
const input = ref('');
const loading = ref(false);
const tip = ref('请上传txt文档');
const historyRef = ref(null);

// 监听聊天记录，自动存 localStorage
watch(list, (val) => {
  localStorage.setItem('rag-panel-history', JSON.stringify(val));
}, { deep: true });

// 初始化读取 localStorage 中的聊天记录
list.value = JSON.parse(localStorage.getItem('rag-panel-history') || '[]'); 

const upload = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/upload-doc`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: text
  });
  tip.value = '✅ 文档已加载';
};

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
      body: JSON.stringify({ prompt: txt })
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
      console.log('解析到的 JSON:', j);
      
      // 尝试不同的返回格式
      if (j.output?.choices?.[0]?.message?.content) {
        const content = j.output.choices[0].message.content;
        // console.log('提取到内容 1:', content);
        // 实现流式输出
        let index = 0;
        const interval = setInterval(() => {
          if (index < content.length) {
            ai.content += content[index];
            index++;
            nextTick(() => historyRef.value?.scrollTo(0, 99999));
          } else {
            clearInterval(interval);
            loading.value = false;
          }
        }, 30); // 调整速度
      } else if (j.content) {
        const content = j.content;
        // console.log('提取到内容 2:', content); 
        // 实现流式输出
        let index = 0;
        const interval = setInterval(() => {
          if (index < content.length) {
            ai.content += content[index];
            index++;
            nextTick(() => historyRef.value?.scrollTo(0, 99999));
          } else {
            clearInterval(interval);
            loading.value = false;
          }
        }, 30);
      } else if (j.message) {
        const content = j.message;
        // console.log('提取到内容 3:', content); 
        // 实现流式输出
        let index = 0;
        const interval = setInterval(() => {
          if (index < content.length) {
            ai.content += content[index];
            index++;
            nextTick(() => historyRef.value?.scrollTo(0, 99999));
          } else {
            clearInterval(interval);
            loading.value = false;
          }
        }, 30);
      } else if (j.result) {
        const content = j.result;
        // console.log('提取到内容 4:', content); 
        // 实现流式输出
        let index = 0;
        const interval = setInterval(() => {
          if (index < content.length) {
            ai.content += content[index];
            index++;
            nextTick(() => historyRef.value?.scrollTo(0, 99999));
          } else {
            clearInterval(interval);
            loading.value = false;
          }
        }, 30);
      } else {
        // 尝试按 SSE 格式解析
        const lines = fullResponse.split('\n');
        // console.log('按行分割:', lines);
        
        let content = '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              const json = JSON.parse(data);
              console.log('解析到的 SSE JSON:', json);
              
              if (json.output?.choices?.[0]?.message?.content) {
                content += json.output.choices[0].message.content;
                // console.log('提取到 SSE 内容:', json.output.choices[0].message.content);
              }
            } catch (e) {
              console.error('解析 SSE 数据失败:', e);
            }
          }
        }
        
        if (content) {
          // console.log('最终提取到的 SSE 内容:', content);
          // 实现流式输出
          let index = 0;
          const interval = setInterval(() => {
            if (index < content.length) {
              ai.content += content[index];
              index++;
              nextTick(() => historyRef.value?.scrollTo(0, 99999));
            } else {
              clearInterval(interval);
              loading.value = false;
            }
          }, 30);
        } else {
          ai.content = '无法解析响应数据';
          loading.value = false;
        }
      }
      // 保存当前聊天记录到 localStorage
      localStorage.setItem('rag-panel-history', JSON.stringify(list.value));
    } catch (e) {
      console.error('解析完整响应失败:', e);
      ai.content = '解析响应数据失败';
      loading.value = false;
    }
  } catch (error) {
    console.error('请求失败:', error);
    ai.content = '请求失败: ' + (error instanceof Error ? error.message : String(error));
    loading.value = false;
  }
};

// 组件卸载时，保存当前聊天记录到 localStorage
onBeforeUnmount(() => {
  localStorage.setItem('rag-panel-history', JSON.stringify(list.value));
});
</script>

<style scoped>
.wrap {
	display: flex;
	flex-direction: column;
	height: 600px;
}
.upload {
	padding: 12px;
	background-color: #f3f4f6;
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