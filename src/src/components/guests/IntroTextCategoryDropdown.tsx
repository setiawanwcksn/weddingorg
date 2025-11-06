/**
 * Intro Text Category Dropdown Component
 * Allows users to select/change intro text categories for guests
 * Categories are predefined and stored directly in guest record
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';

interface IntroTextCategoryDropdownProps {
  guestId: string;
  currentCategory: string;
  onCategoryChange: (guestId: string, category: string) => void;
}

// Available intro text categories based on database structure
const INTRO_TEXT_CATEGORIES = ['Formal', 'Casual'];

export const IntroTextCategoryDropdown: React.FC<IntroTextCategoryDropdownProps> = ({
  guestId,
  currentCategory,
  onCategoryChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [selectedCategory, setSelectedCategory] = useState(currentCategory || 'Formal');

  // Log component initialization
  useEffect(() => {
    console.log(`[IntroTextCategoryDropdown] Component mounted for guest ${guestId}, currentCategory: ${currentCategory}`);
  }, []);

  const categories = INTRO_TEXT_CATEGORIES;

  // Update local state when prop changes
  useEffect(() => {
    setSelectedCategory(currentCategory || 'Formal');
  }, [currentCategory]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click is on a category button (has role="option")
      const target = event.target as HTMLElement;
      const isCategoryButton = target.getAttribute('role') === 'option' || target.closest('[role="option"]');
      
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && !isCategoryButton) {
        console.log(`[IntroTextCategoryDropdown] Click outside detected, closing dropdown`);
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      
      // Calculate dropdown position
      if (buttonRef.current) {
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const dropdownWidth = 128; // w-32 = 128px
        
        console.log(`[IntroTextCategoryDropdown] Button position:`, {
          top: buttonRect.top,
          bottom: buttonRect.bottom,
          left: buttonRect.left,
          width: buttonRect.width
        });
        
        // Position dropdown below button
        setDropdownStyle({
          position: 'fixed',
          top: `${buttonRect.bottom + 4}px`,
          left: `${buttonRect.left}px`,
          width: `${dropdownWidth}px`,
          zIndex: 9999,
        });
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleCategorySelect = (category: string) => {
    console.log(`[IntroTextCategoryDropdown] === CATEGORY SELECTION START ===`);
    console.log(`[IntroTextCategoryDropdown] Selecting category: ${category} for guest ${guestId}`);
    console.log(`[IntroTextCategoryDropdown] Current category before change: ${selectedCategory}`);
    
    // Update local state immediately
    setSelectedCategory(category);
    
    // Call the parent callback immediately
    console.log(`[IntroTextCategoryDropdown] Calling onCategoryChange with guestId: ${guestId}, category: ${category}`);
    onCategoryChange(guestId, category);
    
    // Close dropdown immediately after selection
    setIsOpen(false);
    console.log(`[IntroTextCategoryDropdown] Dropdown closed after selection`);
    
    console.log(`[IntroTextCategoryDropdown] New selected category: ${category}`);
    console.log(`[IntroTextCategoryDropdown] === CATEGORY SELECTION END ===`);
  };

  // Update local state when currentCategory prop changes
  useEffect(() => {
    // This ensures the dropdown reflects the current category
    console.log(`[IntroTextCategoryDropdown] Current category updated to: ${currentCategory} for guest ${guestId}`);
    setSelectedCategory(currentCategory || 'Formal');
  }, [currentCategory, guestId]);

  // Log current state
  useEffect(() => {
    console.log(`[IntroTextCategoryDropdown] Current selectedCategory state: ${selectedCategory} for guest ${guestId}`);
  }, [selectedCategory, guestId]);

  // Log when dropdown opens/closes
  useEffect(() => {
    console.log(`[IntroTextCategoryDropdown] Dropdown ${isOpen ? 'opened' : 'closed'} for guest ${guestId}`);
  }, [isOpen, guestId]);



  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log(`[IntroTextCategoryDropdown] Button clicked, opening dropdown for guest ${guestId}, current isOpen: ${isOpen}`);
          console.log(`[IntroTextCategoryDropdown] Event target:`, e.target);
          setIsOpen(!isOpen);
        }}
        className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs bg-primary/90 text-white hover:bg-primary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[32px]"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        type="button"
      >
        {selectedCategory}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div className="w-28 sm:w-32 bg-white rounded-lg shadow-lg border border-border" style={dropdownStyle}>
          <div className="py-1" role="listbox">
            {categories.map((category: string) => (
              <button
                key={category}
                onClick={(e) => {
                  console.log(`[IntroTextCategoryDropdown] Category option clicked: ${category}`);
                  e.preventDefault();
                  e.stopPropagation();
                  console.log(`[IntroTextCategoryDropdown] Category button clicked: ${category}, isOpen: ${isOpen}`);
                  // Add a small delay to prevent race condition
                  setTimeout(() => {
                    handleCategorySelect(category);
                  }, 10);
                }}
                className={`w-full px-2 sm:px-3 py-1 sm:py-2 text-left text-xs sm:text-sm hover:bg-accent transition-colors focus:outline-none focus:bg-accent min-h-[32px] ${
                  selectedCategory === category ? 'bg-primary/10 text-primary font-medium' : 'text-text'
                }`}
                role="option"
                aria-selected={selectedCategory === category}
                type="button"
              >
                {category}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};