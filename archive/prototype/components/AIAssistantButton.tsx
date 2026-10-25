import React from 'react';
import { MessageCircleIcon } from './Icons';

interface AIAssistantButtonProps {
    onClick: () => void;
}

const AIAssistantButton: React.FC<AIAssistantButtonProps> = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            className="bg-primary text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-transform hover:scale-110"
            aria-label="Open AI Assistant"
        >
            <MessageCircleIcon className="w-8 h-8" />
        </button>
    );
};

export default AIAssistantButton;
