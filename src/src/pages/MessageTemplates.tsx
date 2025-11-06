/**
 * Message Templates Page
 * Manages and displays message templates for campaigns
 */

import React, { useState } from 'react';
import { Search, Plus, Edit2, Trash2, Filter, Mail } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  content: string;
  category: string;
  updatedAt: string;
}

const mockTemplates: Template[] = [
  {
    id: '1',
    name: 'Welcome Message',
    content: 'Hi {name}, welcome to our community! We\'re thrilled to have you here.',
    category: 'General',
    updatedAt: '2 days ago'
  },
  {
    id: '2',
    name: 'Order Confirmation',
    content: 'Your order #{order_id} has been confirmed and will be shipped soon.',
    category: 'E-commerce',
    updatedAt: '1 week ago'
  },
  {
    id: '3',
    name: 'Event Reminder',
    content: 'Don\'t forget! Our webinar starts tomorrow at {time}. See you there!',
    category: 'Events',
    updatedAt: '3 days ago'
  },
  {
    id: '4',
    name: 'Password Reset',
    content: 'Click the link below to reset your password. The link expires in 1 hour.',
    category: 'Security',
    updatedAt: '2 weeks ago'
  },
  {
    id: '5',
    name: 'Feedback Request',
    content: 'We\'d love to hear your thoughts! Please take a moment to share your feedback.',
    category: 'Support',
    updatedAt: '5 days ago'
  },
  {
    id: '6',
    name: 'Birthday Greeting',
    content: 'Happy Birthday, {name}! Wishing you a day filled with joy and laughter.',
    category: 'Personal',
    updatedAt: '1 month ago'
  }
];

export default function MessageTemplates() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'General', 'E-commerce', 'Events', 'Security', 'Support', 'Personal'];

  const filteredTemplates = mockTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleEditTemplate = (templateId: string) => {
    console.log('Edit template:', templateId);
    // TODO: Implement edit functionality
  };

  const handleDeleteTemplate = (templateId: string) => {
    console.log('Delete template:', templateId);
    // TODO: Implement delete functionality
  };

  const handleNewTemplate = () => {
    console.log('Create new template');
    // TODO: Implement create functionality
  };

  return (
    <div className="bg-background">
      <header className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Mail className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-semibold">Message Templates</h1>
            </div>
            <button 
              onClick={handleNewTemplate}
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-500 transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Template</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => (
            <div key={template.id} className="bg-white border border-border rounded-xl p-5 hover:shadow-lg transition">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-lg">{template.name}</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEditTemplate(template.id)}
                    className="text-gray-400 hover:text-primary"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">{template.content}</p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Updated {template.updatedAt}</span>
                <span className="px-2 py-1 bg-secondary text-primary rounded-full">{template.category}</span>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No templates found matching your criteria.</p>
          </div>
        )}
      </main>
    </div>
  );
}