<template>
  <div class="pane" style="padding:20px">
    <h3>AI 代码助手</h3>
    <textarea v-model="prompt" rows="4" placeholder="例如：写一个Vue3弹窗组件、解释这段代码、写一个接口请求..." class="prompt-input" />
    <button @click="run" :disabled="loading" class="btn-primary">{{ loading ? '生成中...' : '生成代码' }}</button>
    <div v-if="result" class="result result-content">{{ result }}</div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
const prompt = ref('');
const result = ref('');
const loading = ref(false);

const run = async () => {
  loading.value = true; result.value = '';
  
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: '只返回代码与简洁解释：' + prompt.value }]
      })
    });

    // console.log('响应状态:', res.status);
    // console.log('响应头:', res.headers);

    const reader = res.body?.getReader();
    const dec = new TextDecoder();
    
    if (!reader) {
      console.error('无法获取响应流');
      result.value = '无法获取响应流';
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

    console.log('完整响应:', fullResponse);
    
    // 尝试解析完整响应
    try {
      const j = JSON.parse(fullResponse);
      console.log('解析到的 JSON:', j);
      
      // 尝试不同的返回格式
      if (j.output?.choices?.[0]?.message?.content) {
        result.value = j.output.choices[0].message.content;
        // console.log('提取到内容 1:', result.value);
      } else if (j.content) {
        result.value = j.content;
        // console.log('提取到内容 2:', result.value);
      } else if (j.message) {
        result.value = j.message;
        console.log('提取到内容 3:', result.value);
      } else if (j.result) {
        result.value = j.result;
        // console.log('提取到内容 4:', result.value);
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
                result.value += json.output.choices[0].message.content;
                // console.log('提取到 SSE 内容:', json.output.choices[0].message.content);
              }
            } catch (e) {
              console.error('解析 SSE 数据失败:', e);
            }
          }
        }
      }
    } catch (e) {
      console.error('解析完整响应失败:', e);
      result.value = '解析响应数据失败';
    }
  } catch (error) {
    console.error('请求失败:', error);
    result.value = '请求失败: ' + (error instanceof Error ? error.message : String(error));
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.prompt-input {
  padding: 10px;
  width: 100%;
  margin-bottom:12px;
  padding:10px;
  box-sizing: border-box;
}
.btn-primary {
  padding: 10px 20px;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.result-content {
  margin-top: 16px;
  padding: 16px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  white-space: pre-wrap;
}
</style>