import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { FiPlus, FiTrash2, FiDownload, FiRefreshCw, FiCheck, FiX, FiInfo, FiSearch } from 'react-icons/fi';
import { PluginManifest } from './types/types';

const PluginManager: React.FC = () => {
    const [plugins, setPlugins] = useState<PluginManifest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newPluginManifest, setNewPluginManifest] = useState<string>('');

    useEffect(() => {
        loadPlugins();
    }, []);

    const loadPlugins = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const plugins: PluginManifest[] = await invoke('get_all_plugins');
            setPlugins(plugins);
        } catch (e) {
            setError(`Failed to load plugins: ${e}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInstallPlugin = async (manifest: PluginManifest) => {
        try {
            await invoke('install_plugin', { manifest });
            await loadPlugins();
            setError(null);
        } catch (e) {
            setError(`Failed to install plugin: ${e}`);
        }
    };

    const handleImportPlugin = async () => {
        try {
            const selected = await open({
                multiple: false,
                filters: [{ name: 'Plugin Manifest', extensions: ['json'] }],
            });
            if (selected) {
                const content = await readTextFile(selected as string);
                const manifest = JSON.parse(content);
                await handleInstallPlugin(manifest);
            }
        } catch (e) {
            setError(`Failed to import plugin: ${e}`);
        }
    };

    const handleRemovePlugin = async (pluginId: string) => {
        if (window.confirm(`Are you sure you want to remove the plugin "${pluginId}"?`)) {
            try {
                await invoke('remove_plugin', { pluginId });
                await loadPlugins();
            } catch (e) {
                setError(`Failed to remove plugin: ${e}`);
            }
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const filteredPlugins = plugins.filter((plugin) =>
        (plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            plugin.id.toLowerCase().includes(searchQuery.toLowerCase())) &&
        (categoryFilter === 'all' || plugin.category === categoryFilter)
    );

    const renderStatusBadge = (status: string) => {
        const colorClass =
            status === 'Active'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
        const icon = status === 'Active' ? <FiCheck className="mr-1" /> : <FiX className="mr-1" />;
        return (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${colorClass}`}>
        {icon}
                {status}
      </span>
        );
    };

    return (
        <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Plugin Manager</h1>
                <div className="flex space-x-3">
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <FiPlus className="mr-2" /> Add Plugin
                    </button>
                    <button
                        onClick={handleImportPlugin}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                        <FiDownload className="mr-2" /> Import
                    </button>
                    <button
                        onClick={loadPlugins}
                        className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                        <FiRefreshCw className="mr-2" /> Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 flex justify-between items-center dark:bg-red-900 dark:border-red-700 dark:text-red-200">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-700 dark:text-red-200">
                        <FiX />
                    </button>
                </div>
            )}

            {/* Search and Filter */}
            <div className="flex space-x-4 mb-6">
                <div className="relative flex-1">
                    <FiSearch className="absolute left-3 top-3 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search plugins by name or ID..."
                        value={searchQuery}
                        onChange={handleSearch}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                    />
                </div>
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                >
                    <option value="all">All Categories</option>
                    <option value="essential">Essential</option>
                    <option value="optional">Optional</option>
                </select>
            </div>

            {showAddForm && (
                <div className="mb-6 p-6 border rounded-lg bg-white dark:bg-gray-800 shadow-lg">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Add New Plugin</h2>
                    <textarea
                        value={newPluginManifest}
                        onChange={(e) => setNewPluginManifest(e.target.value)}
                        className="w-full h-64 p-3 border rounded-lg font-mono text-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-200"
                        placeholder={`{
  "id": "plugin-id",
  "name": "Plugin Name",
  "version": "1.0.0",
  "supported_hosts": ["example.com"],
  "entry_point": "script.py",
  "type": "script",
  "plugin_function": "download",
  "supported_actions": ["download"],
  "category": "essential"
}`}
                    />
                    <div className="flex justify-end space-x-3 mt-4">
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    const manifest = JSON.parse(newPluginManifest);
                                    await handleInstallPlugin(manifest);
                                    setShowAddForm(false);
                                } catch (e) {
                                    setError(`Invalid JSON or failed to install: ${e}`);
                                }
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Install
                        </button>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="text-center py-16">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading plugins...</p>
                </div>
            ) : filteredPlugins.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <p className="text-lg text-gray-600 dark:text-gray-400">No plugins found</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Try adding a new plugin or adjusting your search.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPlugins.map((plugin) => (
                        <div
                            key={plugin.id}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{plugin.name}</h3>
                                {renderStatusBadge(plugin.successful ? 'Active' : 'Inactive')}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">ID: {plugin.id}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Version: {plugin.version}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                Category: {plugin.category || 'Uncategorized'}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Supported Hosts: {plugin.supported_hosts.join(', ') || 'None'}
                            </p>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => handleRemovePlugin(plugin.id)}
                                    className="flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                >
                                    <FiTrash2 className="mr-2" /> Remove
                                </button>
                                {plugin.install_instruction && (
                                    <button
                                        onClick={() => alert(`Install instruction: ${plugin.install_instruction}`)}
                                        className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        <FiInfo className="mr-2" /> Info
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PluginManager;