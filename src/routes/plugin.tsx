import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { FiPlus, FiTrash2, FiDownload, FiRefreshCw, FiCheck, FiX, FiInfo } from 'react-icons/fi';

// Updated Plugin interface to match Rust PluginManifest with explicit type values
interface PluginManifest {
    id: string;
    name: string;
    version: string;
    supported_hosts: string[];
    entry_point: string;
    type: 'script' | 'native' | 'other';
    plugin_function: 'download' | 'translate' | 'emulation';
    external_binary?: boolean;
    language?: string;
    successful?: string;
    install_instruction?: string;
}

const PluginManager: React.FC = () => {
    const [plugins, setPlugins] = useState<string[]>([]);
    const [pluginDetails, setPluginDetails] = useState<Record<string, PluginManifest>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newPluginManifest, setNewPluginManifest] = useState<string>('');
    const [showAddForm, setShowAddForm] = useState(false);

    useEffect(() => {
        loadPlugins();
    }, []);

    const loadPlugins = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Fetch plugin IDs from backend
            const pluginIds: string[] = await invoke('get_plugin_ids');
            setPlugins(pluginIds);

            // Fetch all plugin details at once
            const detailsMap: Record<string, PluginManifest> = await invoke('get_all_plugins');
            setPluginDetails(detailsMap);
        } catch (e) {
            console.error('Failed to load plugins:', e);
            setError(`Failed to load plugins: ${e}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddPlugin = async () => {
        try {
            let manifest: PluginManifest;

            try {
                manifest = JSON.parse(newPluginManifest);
            } catch (e) {
                setError('Invalid JSON format for plugin manifest');
                return;
            }

            // Validate required fields
            if (
                !manifest.id ||
                !manifest.name ||
                !manifest.supported_hosts ||
                !manifest.entry_point ||
                !manifest.type ||
                !manifest.plugin_function
            ) {
                setError('Plugin manifest is missing required fields (id, name, supported_hosts, entry_point, type, plugin_function)');
                return;
            }

            // Validate plugin_function
            const validFunctions = ['download', 'translate', 'emulation'];
            if (!validFunctions.includes(manifest.plugin_function)) {
                setError(`Invalid plugin_function. Must be one of: ${validFunctions.join(', ')}`);
                return;
            }

            // Validate type
            const validTypes = ['script', 'native', 'other'];
            if (!validTypes.includes(manifest.type)) {
                setError(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
                return;
            }

            // Send the manifest to the backend
            await invoke('add_plugin', { manifest });

            // Reload plugins after adding
            await loadPlugins();

            setNewPluginManifest('');
            setShowAddForm(false);
        } catch (e) {
            setError(`Failed to add plugin: ${e}`);
        }
    };

    const handleRemovePlugin = async (pluginId: string) => {
        if (window.confirm(`Are you sure you want to remove the plugin "${pluginId}"?`)) {
            try {
                // Call backend to remove plugin
                await invoke('remove_plugin', { pluginId });

                // Update local state
                setPlugins(plugins.filter((id) => id !== pluginId));
                const newDetails = { ...pluginDetails };
                delete newDetails[pluginId];
                setPluginDetails(newDetails);
            } catch (e) {
                setError(`Failed to remove plugin: ${e}`);
            }
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
                setNewPluginManifest(content);
                setShowAddForm(true);
            }
        } catch (e) {
            setError(`Failed to import plugin: ${e}`);
        }
    };

    const getPluginStatus = (pluginId: string) => {
        const plugin = pluginDetails[pluginId];
        if (!plugin) return 'Unknown';

        // Native plugins are always Active since they run on the backend
        if (plugin.type === 'native') {
            return 'Active';
        }

        // Non-native plugins
        if (plugin.external_binary && !plugin.successful) {
            return `Missing Binary${plugin.install_instruction ? ` (${plugin.install_instruction})` : ''}`;
        }

        return plugin.successful ? 'Active' : 'Inactive';
    };

    const getHostSupport = (hosts: string[]) => {
        if (!hosts || hosts.length === 0) return 'None';

        // แยก wildcard และ non-wildcard hosts
        const wildcardHosts = hosts.filter((h) => h.startsWith('*.'));
        const regularHosts = hosts.filter((h) => !h.startsWith('*.'));

        // ถ้ามี regular hosts น้อยกว่าหรือเท่ากับ 3 และไม่มี wildcard มากเกินไป
        if (regularHosts.length <= 3 && wildcardHosts.length <= 1) {
            const allHosts = [...regularHosts, ...wildcardHosts];
            return allHosts.join(', ');
        }

        // ถ้ามี hosts เยอะเกินไป (รวม wildcard และ regular)
        if (hosts.length > 3) {
            const displayedHosts = regularHosts.slice(0, 3);
            const wildcardSummary = wildcardHosts.length > 0 ? ' + Wildcards' : '';
            const moreCount = hosts.length - displayedHosts.length;
            return `${displayedHosts.join(', ')}${wildcardSummary}${moreCount > 0 ? ` +${moreCount} more` : ''}`;
        }

        // กรณีทั่วไป
        return [...regularHosts, ...wildcardHosts].join(', ');
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Plugin Manager</h1>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="flex items-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                        <FiPlus className="mr-1" /> Add Plugin
                    </button>
                    <button
                        onClick={handleImportPlugin}
                        className="flex items-center px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                    >
                        <FiDownload className="mr-1" /> Import
                    </button>
                    <button
                        onClick={loadPlugins}
                        className="flex items-center px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600"
                    >
                        <FiRefreshCw className="mr-1" /> Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex justify-between items-center dark:bg-red-900 dark:border-red-700 dark:text-red-200">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-700 dark:text-red-200">
                        <FiX />
                    </button>
                </div>
            )}

            {showAddForm && (
                <div className="mb-6 p-4 border rounded bg-gray-50 dark:bg-gray-800">
                    <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Add New Plugin</h2>
                    <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                        Paste the plugin manifest JSON below:
                    </p>
                    <textarea
                        value={newPluginManifest}
                        onChange={(e) => setNewPluginManifest(e.target.value)}
                        className="w-full h-64 p-2 border rounded font-mono text-sm mb-3 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                        placeholder={`{\n  "id": "plugin-id",\n  "name": "Plugin Name",\n  "version": "1.0.0",\n  "supported_hosts": ["example.com"],\n  "entry_point": "script.js",\n  "type": "script",\n  "plugin_function": "download",\n  "external_binary": false,\n  "language": "javascript",\n  "install_instruction": "Install with: npm install plugin-package"\n}`}
                    />
                    <div className="flex justify-end space-x-2">
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="px-3 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddPlugin}
                            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                        >
                            Add Plugin
                        </button>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto dark:border-blue-300"></div>
                    <p className="mt-3 text-gray-600 dark:text-gray-400">Loading plugins...</p>
                </div>
            ) : plugins.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded border dark:bg-gray-800 dark:border-gray-700">
                    <p className="text-lg text-gray-600 dark:text-gray-400">No plugins installed</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        Add plugins to extend the application's functionality
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white dark:bg-gray-800 border rounded-lg overflow-hidden dark:border-gray-700">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="py-3 px-4 text-left text-gray-700 dark:text-gray-300">ID</th>
                            <th className="py-3 px-4 text-left text-gray-700 dark:text-gray-300">Name</th>
                            <th className="py-3 px-4 text-left text-gray-700 dark:text-gray-300">Version</th>
                            <th className="py-3 px-4 text-left text-gray-700 dark:text-gray-300">Type</th>
                            <th className="py-3 px-4 text-left text-gray-700 dark:text-gray-300">Function</th>
                            <th className="py-3 px-4 text-left text-gray-700 dark:text-gray-300">Supported Hosts</th>
                            <th className="py-3 px-4 text-left text-gray-700 dark:text-gray-300">Status</th>
                            <th className="py-3 px-4 text-left text-gray-700 dark:text-gray-300">Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {plugins.map((pluginId) => {
                            const plugin = pluginDetails[pluginId];
                            return (
                                <tr
                                    key={pluginId}
                                    className="border-t hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-700"
                                >
                                    <td className="py-3 px-4 font-mono text-sm text-gray-800 dark:text-gray-200">
                                        {pluginId}
                                    </td>
                                    <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                                        {plugin?.name || pluginId}
                                    </td>
                                    <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                                        {plugin?.version || 'Unknown'}
                                    </td>
                                    <td className="py-3 px-4">
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs ${
                                                    plugin?.type === 'script'
                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                        : plugin?.type === 'native'
                                                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                                }`}
                                            >
                                                {plugin?.type || 'Unknown'}
                                            </span>
                                    </td>
                                    <td className="py-3 px-4">
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs ${
                                                    plugin?.plugin_function === 'download'
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                        : plugin?.plugin_function === 'translate'
                                                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                            : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                                                }`}
                                            >
                                                {plugin?.plugin_function || 'Unknown'}
                                            </span>
                                    </td>
                                    <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                                        {plugin?.supported_hosts ? getHostSupport(plugin.supported_hosts) : 'None'}
                                    </td>
                                    <td className="py-3 px-4">
                                            <span
                                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                                                    getPluginStatus(pluginId) === 'Active'
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                        : getPluginStatus(pluginId).startsWith('Missing Binary')
                                                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                }`}
                                            >
                                                {getPluginStatus(pluginId) === 'Active' && <FiCheck className="mr-1" />}
                                                {getPluginStatus(pluginId).startsWith('Missing Binary') && (
                                                    <FiX className="mr-1" />
                                                )}
                                                {getPluginStatus(pluginId)}
                                            </span>
                                    </td>
                                    <td className="py-3 px-4 flex space-x-2">
                                        <button
                                            onClick={() => handleRemovePlugin(pluginId)}
                                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                            title="Remove Plugin"
                                        >
                                            <FiTrash2 size={18} />
                                        </button>
                                        {plugin?.install_instruction && (
                                            <button
                                                onClick={() =>
                                                    alert(`Install instruction: ${plugin.install_instruction}`)
                                                }
                                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                title="View Install Instruction"
                                            >
                                                <FiInfo size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default PluginManager;