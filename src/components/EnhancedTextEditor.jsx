import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hash, AtSign, X } from 'lucide-react';
import { useAdvancedSocial } from '@/hooks/useAdvancedSocial';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const EnhancedTextEditor = ({ 
  value = '', 
  onChange,
  onSubmit,
  placeholder = "¿Qué está pasando?",
  maxLength = 500,
  disabled = false,
  showFormatting = true,
  className = ""
}) => {
  const { user } = useAuth();
  const { searchUsersForMention, getTrendingHashtags } = useAdvancedSocial(user);
  
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionType, setSuggestionType] = useState(null); // 'mention' | 'hashtag'
  const [suggestionPosition, setSuggestionPosition] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [hashtagQuery, setHashtagQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  
  const textareaRef = useRef(null);
  const suggestionRef = useRef(null);

  // Load trending hashtags
  useEffect(() => {
    const loadTrendingHashtags = async () => {
      const trending = await getTrendingHashtags(5);
      setTrendingHashtags(trending);
    };
    
    loadTrendingHashtags();
  }, [getTrendingHashtags]);

  // Handle text change and check for mentions/hashtags
  const handleTextChange = useCallback(async (e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);
    setCursorPosition(cursorPos);

    // Check for mention trigger (@)
    const mentionMatch = newValue.slice(0, cursorPos).match(/@(\w*)$/);
    if (mentionMatch) {
      const query = mentionMatch[1];
      setMentionQuery(query);
      setSuggestionType('mention');
      setSuggestionPosition(0);
      
      if (query.length >= 1) {
        const users = await searchUsersForMention(query);
        setSuggestions(users);
      } else {
        setSuggestions([]);
      }
      return;
    }

    // Check for hashtag trigger (#)
    const hashtagMatch = newValue.slice(0, cursorPos).match(/#(\w*)$/);
    if (hashtagMatch) {
      const query = hashtagMatch[1];
      setHashtagQuery(query);
      setSuggestionType('hashtag');
      setSuggestionPosition(0);
      
      if (query.length >= 1) {
        // Filter trending hashtags that match the query
        const filteredHashtags = trendingHashtags
          .filter(h => h.hashtag.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 5);
        setSuggestions(filteredHashtags);
      } else {
        setSuggestions(trendingHashtags.slice(0, 5));
      }
      return;
    }

    // No triggers found, clear suggestions
    setSuggestions([]);
    setSuggestionType(null);
  }, [onChange, searchUsersForMention, trendingHashtags]);

  // Handle keyboard navigation in suggestions
  const handleKeyDown = useCallback((e) => {
    if (!suggestions.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSuggestionPosition(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSuggestionPosition(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        selectSuggestion(suggestions[suggestionPosition]);
        break;
      case 'Escape':
        setSuggestions([]);
        setSuggestionType(null);
        break;
    }
  }, [suggestions, suggestionPosition]);

  // Select a suggestion (mention or hashtag)
  const selectSuggestion = useCallback((suggestion) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const currentValue = value;
    const cursorPos = cursorPosition;

    let newValue;
    let newCursorPos;

    if (suggestionType === 'mention') {
      // Replace @query with @username
      const beforeMention = currentValue.slice(0, cursorPos).replace(/@\w*$/, '');
      const afterMention = currentValue.slice(cursorPos);
      const mentionText = `@${suggestion.nombre_usuario || suggestion.nombre.replace(/\s+/g, '')}`;
      
      newValue = beforeMention + mentionText + ' ' + afterMention;
      newCursorPos = beforeMention.length + mentionText.length + 1;
    } else if (suggestionType === 'hashtag') {
      // Replace #query with #hashtag
      const beforeHashtag = currentValue.slice(0, cursorPos).replace(/#\w*$/, '');
      const afterHashtag = currentValue.slice(cursorPos);
      const hashtagText = `#${suggestion.hashtag || suggestion}`;
      
      newValue = beforeHashtag + hashtagText + ' ' + afterHashtag;
      newCursorPos = beforeHashtag.length + hashtagText.length + 1;
    }

    onChange(newValue);
    setSuggestions([]);
    setSuggestionType(null);

    // Set cursor position after state update
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [value, cursorPosition, suggestionType, onChange]);

  // Render enhanced text with syntax highlighting
  const renderPreview = useCallback(() => {
    if (!value) return null;

    let processedText = value;
    
    // Highlight mentions
    processedText = processedText.replace(/@(\w+)/g, '<span class="text-cyan-400 font-medium">@$1</span>');
    
    // Highlight hashtags
    processedText = processedText.replace(/#(\w+)/g, '<span class="text-blue-400 font-medium">#$1</span>');

    return (
      <div 
        className="absolute inset-0 p-3 text-transparent pointer-events-none whitespace-pre-wrap break-words"
        dangerouslySetInnerHTML={{ __html: processedText }}
      />
    );
  }, [value]);

  // Get character count info
  const getCharacterInfo = useCallback(() => {
    const remaining = maxLength - value.length;
    const isNearLimit = remaining <= 50;
    const isOverLimit = remaining < 0;
    
    return { remaining, isNearLimit, isOverLimit };
  }, [value.length, maxLength]);

  const { remaining, isNearLimit, isOverLimit } = getCharacterInfo();

  return (
    <div className={`relative ${className}`}>
      {/* Main Text Area */}
      <div className="relative">
        {/* Background/Preview Layer */}
        {showFormatting && renderPreview()}
        
        {/* Actual Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onKeyUp={(e) => setCursorPosition(e.target.selectionStart)}
          onMouseUp={(e) => setCursorPosition(e.target.selectionStart)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white placeholder-blue-400 resize-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 relative z-10 ${
            showFormatting ? 'bg-transparent' : ''
          } ${
            isOverLimit ? 'border-red-500 focus:ring-red-500' : ''
          }`}
          style={{ 
            minHeight: '120px',
            background: showFormatting ? 'transparent' : undefined 
          }}
        />
        
        {/* Background for textarea when showing formatting */}
        {showFormatting && (
          <div className="absolute inset-0 bg-slate-800/50 border border-white/10 rounded-xl -z-10" />
        )}
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div
            ref={suggestionRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-sm border border-white/20 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto"
          >
            <div className="p-3">
              <p className="text-xs text-blue-400 font-medium mb-2 flex items-center gap-2">
                {suggestionType === 'mention' ? (
                  <>
                    <AtSign className="w-3 h-3" />
                    Mencionar usuarios
                  </>
                ) : (
                  <>
                    <Hash className="w-3 h-3" />
                    Hashtags sugeridos
                  </>
                )}
              </p>
              
              <div className="space-y-1">
                {suggestions.map((suggestion, index) => (
                  <motion.div
                    key={suggestionType === 'mention' ? suggestion.id : suggestion.hashtag || index}
                    whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                    onClick={() => selectSuggestion(suggestion)}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      index === suggestionPosition ? 'bg-white/10' : ''
                    }`}
                  >
                    {suggestionType === 'mention' ? (
                      <>
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={suggestion.foto_perfil} />
                          <AvatarFallback className="bg-blue-600 text-white text-xs">
                            {suggestion.nombre?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-white text-sm font-medium">{suggestion.nombre}</p>
                          {suggestion.nombre_usuario && (
                            <p className="text-blue-400 text-xs">@{suggestion.nombre_usuario}</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-600/30 rounded-lg flex items-center justify-center">
                            <Hash className="w-4 h-4 text-blue-400" />
                          </div>
                          <span className="text-white font-medium">#{suggestion.hashtag || suggestion}</span>
                        </div>
                        {suggestion.count && (
                          <span className="text-xs text-blue-400">{suggestion.count} posts</span>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer with character count and formatting hints */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-4 text-xs text-blue-400">
          {showFormatting && (
            <>
              <div className="flex items-center gap-1">
                <AtSign className="w-3 h-3" />
                <span>@usuario para mencionar</span>
              </div>
              <div className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                <span>#hashtag para etiquetar</span>
              </div>
            </>
          )}
        </div>

        {/* Character Counter */}
        <div className={`text-xs font-medium ${
          isOverLimit ? 'text-red-400' : 
          isNearLimit ? 'text-yellow-400' : 
          'text-blue-400'
        }`}>
          {remaining < 0 ? `${Math.abs(remaining)} caracteres de más` : `${remaining} restantes`}
        </div>
      </div>
    </div>
  );
};

export default EnhancedTextEditor;