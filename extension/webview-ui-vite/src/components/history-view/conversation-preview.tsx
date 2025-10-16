// 对话预览组件 - 显示用户历史对话的竖线和悬浮窗
import { useState, useEffect } from 'react';
import { rpcClient } from '@/lib/rpc-client';
import ArrowTooltips from '@/components/ui/arrow-tooltips';

// 组件属性类型
type ConversationPreviewProps = {
  taskId: string; // 任务ID
  tooltipDirection?: 'top' | 'bottom' | 'left' | 'right'; // 悬浮窗方向，默认向上
};

// 对话预览组件
const ConversationPreview = ({ taskId, tooltipDirection = 'top' }: ConversationPreviewProps) => {
  // 管理用户消息
  const [userMessages, setUserMessages] = useState<string[]>([]);

  // 加载用户消息（只加载一次）
  useEffect(() => {
    const loadUserMessages = async () => {
      try {
        // 使用 RPC 获取任务的对话预览
        const result = await rpcClient.getTaskPreview.use({ taskId });
        // 只保留用户消息
        const userOnly = (result.messages || [])
          .filter((msg: string) => msg.startsWith('User: '))
          .map((msg: string) => msg.replace('User: ', ''));
        setUserMessages(userOnly);
      } catch (error) {
        console.error('Failed to load preview:', error);
        setUserMessages([]);
      }
    };
    loadUserMessages();
  }, [taskId]);

  // 如果没有用户消息，不显示任何内容
  if (userMessages.length === 0) {
    return null;
  }

  // 渲染竖线和悬浮窗
  return (
    <div className='flex items-center gap-1'>
      {userMessages.map((msg, i) => (
        <ArrowTooltips
          key={i}
          title={msg}
          side={tooltipDirection}
          delayDuration={50}
        >
          <div
            className='w-0.5 h-3 bg-current opacity-60 hover:opacity-100 hover:h-4 transition-all duration-75 cursor-help'
          />
        </ArrowTooltips>
      ))}
    </div>
  );
};

export default ConversationPreview;

