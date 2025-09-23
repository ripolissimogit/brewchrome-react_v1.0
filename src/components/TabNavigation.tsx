import { File, Globe, Archive } from 'lucide-react';
import type { TabType } from '../types';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs = [
    { id: 'files' as TabType, label: 'Files', icon: File },
    { id: 'urls' as TabType, label: 'URLs', icon: Globe },
    { id: 'archive' as TabType, label: 'Archive', icon: Archive },
  ];

  return (
    <div className="flex justify-center mb-8">
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`tab-button ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}