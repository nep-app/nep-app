import React from 'react';
import * as Icons from '../Icons';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';

// Import markdown files as raw strings at build time
import LICENSE_MD from '../../../LICENSE.md?raw';
import TERMS_MD from '../../../TERMS_OF_USE.md?raw';
import GOVERNANCE_MD from '../../../ETHICAL_GOVERNANCE.md?raw';

export const LegalModal = ({
  isOpen,
  onClose,
  documentType // 'license', 'terms', 'governance'
}) => {
  useModalKeyboard(isOpen, onClose, null);
  const documentConfig = {
    license: {
      title: '📜 Licença',
      content: LICENSE_MD
    },
    terms: {
      title: '📋 Termos de Uso',
      content: TERMS_MD
    },
    governance: {
      title: '⚖️ Governança Ética',
      content: GOVERNANCE_MD
    }
  };

  if (!isOpen) return null;

  const config = documentType ? documentConfig[documentType] : null;
  const content = config ? config.content : '';

  // Simple markdown-to-HTML converter for basic formatting
  const renderMarkdown = (text) => {
    const lines = text.split('\n');
    const result = [];
    let inList = false;
    let listItems = [];

    const flushList = () => {
      if (listItems.length > 0) {
        result.push(
          <ul key={`list-${result.length}`} className="list-disc list-inside ml-4 mb-4 space-y-1 text-gray-300">
            {listItems.map((item, idx) => (
              <li key={idx} className="leading-relaxed">{item}</li>
            ))}
          </ul>
        );
        listItems = [];
      }
      inList = false;
    };

    lines.forEach((line, idx) => {
      // Headers
      if (line.startsWith('# ')) {
        flushList();
        result.push(<h1 key={idx} className="text-2xl font-bold mb-4 mt-6 text-white">{line.slice(2)}</h1>);
      } else if (line.startsWith('## ')) {
        flushList();
        result.push(<h2 key={idx} className="text-xl font-bold mb-3 mt-5 text-purple-300">{line.slice(3)}</h2>);
      } else if (line.startsWith('### ')) {
        flushList();
        result.push(<h3 key={idx} className="text-lg font-semibold mb-2 mt-4 text-purple-400">{line.slice(4)}</h3>);
      }
      // List items
      else if (line.startsWith('* ') || line.startsWith('- ')) {
        inList = true;
        const text = line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        listItems.push(<span dangerouslySetInnerHTML={{ __html: text }} />);
      }
      // Regular paragraphs
      else if (line.trim() !== '') {
        flushList();
        // Handle bold text
        const text = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
        result.push(
          <p key={idx} className="mb-3 leading-relaxed text-gray-300" dangerouslySetInnerHTML={{ __html: text }} />
        );
      }
      // Empty lines
      else {
        flushList();
      }
    });

    flushList();
    return result;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-gray-800 border-gray-700 rounded-2xl p-6 max-w-3xl w-full max-h-[90dvh] overflow-hidden flex flex-col border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-700">
          <h3 className="text-2xl font-bold text-white">{config.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:opacity-70 transition-opacity">
            <Icons.X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-2">
          <div className="markdown-content">
            {renderMarkdown(content)}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-lg font-medium transition-colors bg-gray-700 text-white hover:bg-gray-600"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
