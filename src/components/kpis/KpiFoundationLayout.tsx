import React, { useState, useEffect } from 'react';
import { Target, Calendar, ListTree, BookOpen, Layers } from 'lucide-react';
import { KpiPeriodView } from './periods/KpiPeriodView';
import { KpiObjectiveView } from './objectives/KpiObjectiveView';
import { KpiDefinitionView } from './definitions/KpiDefinitionView';
import { KpiTemplateView } from './templates/KpiTemplateView';

export const KpiFoundationLayout: React.FC = () => {
  const getInitialTab = () => {
    const hash = window.location.hash.replace('#/', '');
    if (hash.startsWith('kpis/periods')) return 'periods';
    if (hash.startsWith('kpis/objectives')) return 'objectives';
    if (hash.startsWith('kpis/definitions')) return 'definitions';
    if (hash.startsWith('kpis/templates')) return 'templates';
    return 'periods';
  };

  const [activeTab, setActiveTab] = useState<'periods' | 'objectives' | 'definitions' | 'templates'>(getInitialTab);

  useEffect(() => {
    const handleHashChange = () => {
      setActiveTab(getInitialTab());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = (tab: 'periods' | 'objectives' | 'definitions' | 'templates') => {
    setActiveTab(tab);
    window.location.hash = `#/kpis/${tab}`;
  };

  return (
    <div className="space-y-4">
      {/* KPI Foundation Navigation */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
        <button
          onClick={() => handleTabChange('periods')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === 'periods'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Kỳ đánh giá
        </button>
        <button
          onClick={() => handleTabChange('objectives')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === 'objectives'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'
          }`}
        >
          <ListTree className="h-4 w-4" />
          Mục tiêu
        </button>
        <button
          onClick={() => handleTabChange('definitions')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === 'definitions'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Danh mục KPI
        </button>
        <button
          onClick={() => handleTabChange('templates')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === 'templates'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'
          }`}
        >
          <Layers className="h-4 w-4" />
          Mẫu KPI
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        {activeTab === 'periods' && <KpiPeriodView />}
        {activeTab === 'objectives' && <KpiObjectiveView />}
        {activeTab === 'definitions' && <KpiDefinitionView />}
        {activeTab === 'templates' && <KpiTemplateView />}
      </div>
    </div>
  );
};
