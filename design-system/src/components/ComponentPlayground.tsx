import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface PropControl {
  name: string;
  type: 'text' | 'select' | 'boolean' | 'color';
  options?: string[];
  defaultValue?: any;
}

interface ComponentPlaygroundProps {
  component: React.ComponentType<any>;
  controls: PropControl[];
  title: string;
  description?: string;
}

export function ComponentPlayground({ component: Component, controls, title, description }: ComponentPlaygroundProps) {
  const [props, setProps] = useState<Record<string, any>>(() => {
    const defaults: Record<string, any> = {};
    controls.forEach(c => {
      defaults[c.name] = c.defaultValue;
    });
    return defaults;
  });

  const handleChange = (name: string, value: any) => {
    setProps(prev => ({ ...prev, [name]: value }));
  };

  const reset = () => {
    const defaults: Record<string, any> = {};
    controls.forEach(c => {
      defaults[c.name] = c.defaultValue;
    });
    setProps(defaults);
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white mb-8">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-slate-900">{title}</h3>
          {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
        </div>
        <button onClick={reset} className="p-2 hover:bg-slate-200 rounded-full transition-colors" title="Reset props">
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="grid lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        {/* Preview Area */}
        <div className="lg:col-span-2 p-12 flex items-center justify-center bg-slate-50/50 min-h-[300px]">
          <Component {...props} />
        </div>

        {/* Controls Area */}
        <div className="p-6 bg-white space-y-6">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Properties</h4>
          {controls.map(control => (
            <div key={control.name} className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 capitalize">
                {control.name}
              </label>
              
              {control.type === 'text' && (
                <input
                  type="text"
                  value={props[control.name]}
                  onChange={(e) => handleChange(control.name, e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-[#003764]"
                />
              )}

              {control.type === 'select' && (
                <select
                  value={props[control.name]}
                  onChange={(e) => handleChange(control.name, e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-[#003764]"
                >
                  {control.options?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}

              {control.type === 'boolean' && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleChange(control.name, !props[control.name])}
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                      ${props[control.name] ? 'bg-[#003764]' : 'bg-slate-200'}
                    `}
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${props[control.name] ? 'translate-x-6' : 'translate-x-1'}
                      `}
                    />
                  </button>
                  <span className="text-sm text-slate-500">{props[control.name] ? 'True' : 'False'}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Code Snippet */}
      <div className="bg-slate-900 p-4 overflow-x-auto">
        <code className="text-xs font-mono text-blue-200">
          {`<${component.displayName || 'Component'} \n`}
          {Object.entries(props).map(([key, value]) => (
            `  ${key}={${typeof value === 'string' ? `"${value}"` : `{${value}}`}}\n`
          ))}
          {`/>`}
        </code>
      </div>
    </div>
  );
}
