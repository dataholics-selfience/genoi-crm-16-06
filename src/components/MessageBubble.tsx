import { MessageType } from '../types';

interface MessageBubbleProps {
  message: MessageType;
  isLoading?: boolean;
}

const MessageBubble = ({ message, isLoading = false }: MessageBubbleProps) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-3xl rounded-lg p-4 ${
        isUser 
          ? 'bg-blue-700 text-white ml-8' 
          : 'bg-assistant-bg text-gray-100 mr-8'
      }`}>
        {!isUser && (
          <div className="flex items-center mb-2">
            <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-semibold mr-2">
              AI
            </div>
            <span className="font-medium">Assistente</span>
          </div>
        )}
        <p className={`whitespace-pre-wrap ${
          isLoading ? 'typing-effect' : ''
        }`}>
          {message.content}
        </p>
      </div>
    </div>
  );
};

export default MessageBubble;