// 对话预览组件 - 显示用户历史对话的竖线和悬浮窗
import { useState, useEffect, useRef } from 'react';
import { rpcClient } from '@/lib/rpc-client';

// 组件属性类型
type ConversationPreviewProps = {
  taskId: string; // 任务ID
  tooltipDirection?: 'up' | 'down'; // 悬浮窗方向，默认向下
};

// 对话预览组件
const ConversationPreview = ({ taskId, tooltipDirection = 'down' }: ConversationPreviewProps) => {
  // 管理对话预览悬浮窗状态
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState<number>(-1);
  const [userMessages, setUserMessages] = useState<string[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);

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

  // 处理单个竖线悬停
  const handleBarHover = (index: number) => {
    setCurrentPreviewIndex(index);
  };

  // 处理离开预览区域
  const handlePreviewLeave = () => {
    setCurrentPreviewIndex(-1);
  };

  // 如果没有用户消息，不显示任何内容
  if (userMessages.length === 0) {
    return null;
  }

  // 渲染竖线和悬浮窗
  return (
    <div
      className='relative flex items-center gap-1 cursor-help'
      onMouseLeave={handlePreviewLeave}
    >
      {userMessages.map((msg, i) => (
        <div
          key={i}
          className='relative'
          onMouseEnter={() => handleBarHover(i)}
        >
          <div
            className={`w-0.5 h-3 bg-current ${
              currentPreviewIndex === i
                ? 'opacity-100 h-4'
                : 'opacity-60'
            }`}
          />
          {/* 悬浮窗 - 每个竖线对应一个 */}
          {currentPreviewIndex === i && (
            <div
              ref={previewRef}
              className={`absolute left-1/2 -translate-x-1/2 ${
                tooltipDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
              } w-80 max-w-[90vw] bg-popover text-popover-foreground border border-border rounded-md shadow-lg p-3 z-50`}
              style={{ pointerEvents: 'none' }}
            >
              <div className='text-xs font-semibold text-muted-foreground uppercase border-b pb-1 mb-2'>
                User Message #{i + 1}
              </div>
              <div className='text-xs py-1 px-2 rounded bg-secondary/50 whitespace-pre-wrap break-words'>
                {msg}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ConversationPreview;

