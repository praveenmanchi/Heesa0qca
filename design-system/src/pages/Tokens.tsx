import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { figmaTokens as staticTokens } from '../data/figmaTokens';
import { Search, RefreshCw, Settings, AlertCircle, Check } from 'lucide-react';
import { fetchFigmaVariables, FigmaVariable } from '../services/figmaService';

export function Tokens() {
  const [filter, setFilter] = useState('');
  const [tokens, setTokens] = useState<any[]>(staticTokens);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({
    fileKey: localStorage.getItem('figma_file_key') || '',
    token: localStorage.getItem('figma_token') || ''
  });
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const filteredTokens = tokens.filter(token => 
    token.name.toLowerCase().includes(filter.toLowerCase()) ||
    token.type.toLowerCase().includes(filter.toLowerCase())
  );

  const handleSync = async () => {
    if (!config.fileKey || !config.token) {
      setShowConfig(true);
      return;
    }

    setIsSyncing(true);
    setStatus(null);

    try {
      const newTokens = await fetchFigmaVariables(config.fileKey, config.token);
      setTokens(newTokens);
      setStatus({ type: 'success', message: `Successfully synced ${newTokens.length} tokens from Figma!` });
      
      // Save credentials
      localStorage.setItem('figma_file_key', config.fileKey);
      localStorage.setItem('figma_token', config.token);
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message || 'Failed to sync with Figma' });
    } finally {
      setIsSyncing(false);
    }
  };

  const formatValue = (token: any) => {
    // Figma API returns valuesByMode. We'll take the first mode available.
    const modeId = Object.keys(token.valuesByMode)[0];
    const val = token.valuesByMode[modeId];

    if (token.type === 'COLOR') {
      // Handle alias if present (simplified for demo)
      if (val.type === 'VARIABLE_ALIAS') return 'Alias';
      
      const { r, g, b, a } = val;
      const toHex = (c: number) => {
        const hex = Math.round(c * 255).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      };
      return `#${toHex(r)}${toHex(g)}${toHex(b)}${a !== 1 ? Math.round(a * 100) + '%' : ''}`.toUpperCase();
    }
    if (token.type === 'FLOAT') {
      if (val.type === 'VARIABLE_ALIAS') return 'Alias';
      return val + 'px';
    }
    return JSON.stringify(val);
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <motion.h1 variants={item} className="text-4xl font-display font-bold text-slate-900 mb-4">Design Tokens</motion.h1>
          <motion.p variants={item} className="text-xl text-slate-600 max-w-3xl leading-relaxed">
            The single source of truth for all design values. 
            {tokens === staticTokens ? ' Currently showing static data.' : ' Synced with live Figma file.'}
          </motion.p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className="p-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Configure Figma API"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-6 py-3 bg-[#003764] text-white rounded-lg font-bold hover:bg-[#003764]/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync with Figma'}
          </button>
        </div>
      </header>

      {/* Configuration Panel */}
      {showConfig && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4"
        >
          <h3 className="font-bold text-slate-900">Figma API Configuration</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">File Key</label>
              <input 
                type="text" 
                value={config.fileKey}
                onChange={e => setConfig({...config, fileKey: e.target.value})}
                placeholder="e.g. j8y934..."
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
              <p className="text-xs text-slate-400 mt-1">Found in the Figma file URL: figma.com/file/<b>KEY</b>/...</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Personal Access Token</label>
              <input 
                type="password" 
                value={config.token}
                onChange={e => setConfig({...config, token: e.target.value})}
                placeholder="figd_..."
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
              <p className="text-xs text-slate-400 mt-1">Generate in Figma Settings &gt; Account &gt; Personal Access Tokens</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Status Message */}
      {status && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`p-4 rounded-lg flex items-center gap-3 ${
            status.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {status.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {status.message}
        </motion.div>
      )}

      <motion.div variants={item} className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input 
          type="text" 
          placeholder="Filter tokens..." 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#003764] focus:ring-1 focus:ring-[#003764]"
        />
      </motion.div>

      <motion.div variants={item} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Value</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTokens.map((token) => (
              <tr key={token.id} className="hover:bg-slate-50/50">
                <td className="p-4 font-mono text-sm text-slate-700">{token.name}</td>
                <td className="p-4 text-sm text-slate-500">
                  <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold">{token.type}</span>
                </td>
                <td className="p-4 font-mono text-sm text-slate-600">{formatValue(token)}</td>
                <td className="p-4">
                  {token.type === 'COLOR' && !formatValue(token).includes('Alias') && (
                    <div 
                      className="w-8 h-8 rounded border border-slate-200 shadow-sm" 
                      style={{ backgroundColor: formatValue(token) }}
                    />
                  )}
                  {token.type === 'FLOAT' && token.name.includes('Spacing') && !formatValue(token).includes('Alias') && (
                    <div 
                      className="h-4 bg-[#003764]/20 rounded" 
                      style={{ width: formatValue(token) }}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </motion.div>
  );
}
