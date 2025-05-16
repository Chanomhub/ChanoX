import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { FiPlus, FiTrash2, FiDownload, FiRefreshCw, FiCheck, FiX, FiInfo, FiPlay } from 'react-icons/fi';

interface PluginManifest {
    id: string;
    name: string;
    version: string;
    supported_hosts: string[];
    entry_point: string;
    type: 'script' | 'command';
    plugin_function: 'download' | 'translate' | 'emulation' | string;
    external_binary?: boolean;
    language?: string;
    successful?: string;
    install_instruction?: string;
    supported_actions: string[];
}

// No plugins message component
const NoPluginsMessage = () => (
    <div className="card bg-base-200 shadow-xl p-10">
        <div className="card-body text-center">
            <h2 className="text-lg font-semibold">No plugins installed</h2>
            <p className="text-sm text-base-content/70">
                Add plugins to extend the application's functionality
            </p>
        </div>
    </div>
);

// Plugin table component
const PluginsTable = ({
                          plugins,
                          pluginDetails,
                          renderTypeBadge,
                          renderFunctionBadge,
                          getHostSupport,
                          renderStatusBadge,
                          getPluginStatus,
                          handleRemovePlugin,
                          handleTestAction,
                          setTestAction,
                          setTestInput,
                          testAction,
                          testInput,
                      }) => (
    <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
            <thead>
            <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Version</th>
                <th>Type</th>
                <th>Function</th>
                <th>Supported Hosts</th>
                <th>Actions</th>
                <th>Status</th>
                <th>Controls</th>
            </tr>
            </thead>
            <tbody>
            {plugins.map((pluginId) => {
                const plugin = pluginDetails[pluginId];
                return (
                    <tr key={pluginId}>
                        <td className="font-mono text-sm">{pluginId}</td>
                        <td>{plugin?.name || pluginId}</td>
                        <td>{plugin?.version || 'Unknown'}</td>
                        <td>{renderTypeBadge(plugin?.type)}</td>
                        <td>{renderFunctionBadge(plugin?.plugin_function)}</td>
                        <td>{plugin?.supported_hosts ? getHostSupport(plugin.supported_hosts) : 'None'}</td>
                        <td>{plugin?.supported_actions?.join(', ') || 'None'}</td>
                        <td>{renderStatusBadge(getPluginStatus(pluginId))}</td>
                        <td>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleRemovePlugin(pluginId)}
                                    className="btn btn-error btn-sm"
                                    title="Remove Plugin"
                                >
                                    <FiTrash2 size={18} />
                                </button>
                                {plugin?.install_instruction && (
                                    <button
                                        onClick={() => alert(`Install instruction: ${plugin.install_instruction}`)}
                                        className="btn btn-info btn-sm"
                                        title="View Install Instruction"
                                    >
                                        <FiInfo size={18} />
                                    </button>
                                )}
                                {plugin?.supported_actions?.length > 0 && (
                                    <div className="flex gap-2 items-center">
                                        <select
                                            onChange={(e) => setTestAction(e.target.value)}
                                            className="select select-sm select-bordered"
                                        >
                                            <option value="">Select Action</option>
                                            {plugin.supported_actions.map((action) => (
                                                <option key={action} value={action}>
                                                    {action}
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            type="text"
                                            placeholder="JSON input"
                                            onChange={(e) => setTestInput(e.target.value)}
                                            className="input input-sm input-bordered w-32"
                                        />
                                        <button
                                            onClick={() => handleTestAction(pluginId, testAction, testInput)}
                                            className="btn btn-success btn-sm"
                                            title="Test Action"
                                            disabled={!testAction}
                                        >
                                            <FiPlay size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </td>
                    </tr>
                );
            })}
            </tbody>
        </table>
    </div>
);

const PluginManager: React.FC = () => {
    const [plugins, setPlugins] = useState<string[]>([]);
    const [pluginDetails, setPluginDetails] = useState<Record<string, PluginManifest>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newPluginManifest, setNewPluginManifest] = useState<string>('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [testAction, setTestAction] = useState<string>('');
    const [testInput, setTestInput] = useState<string>('');

    useEffect(() => {
        loadPlugins();
    }, []);

    const loadPlugins = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const pluginIds: string[] = await invoke('get_plugin_ids');
            setPlugins(pluginIds);

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

            const requiredFields = [
                'id', 'name', 'supported_hosts', 'entry_point',
                'type', 'plugin_function', 'supported_actions'
            ];

            const missingFields = requiredFields.filter(field => !manifest[field as keyof PluginManifest]);

            if (missingFields.length > 0) {
                setError(`Plugin manifest is missing required fields: ${missingFields.join(', ')}`);
                return;
            }

            const validFunctions = ['download', 'translate', 'emulation'];
            if (!validFunctions.includes(manifest.plugin_function) &&
                !manifest.plugin_function.startsWith('custom_')) {
                setError(`Invalid plugin_function. Must be one of: ${validFunctions.join(', ')} or start with 'custom_'`);
                return;
            }

            const validTypes = ['script', 'command'];
            if (!validTypes.includes(manifest.type)) {
                setError(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
                return;
            }

            if (!Array.isArray(manifest.supported_actions) || manifest.supported_actions.length === 0) {
                setError('supported_actions must be a non-empty array of strings');
                return;
            }

            await invoke('add_plugin', { manifest });
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
                await invoke('remove_plugin', { pluginId });
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

            if (typeof selected !== 'string') {
                setError('No file selected or invalid file');
                return;
            }

            const content = await readTextFile(selected);
            setNewPluginManifest(content);
            setShowAddForm(true);
        } catch (e) {
            setError(`Failed to import plugin: ${e}`);
        }
    };

    const handleTestAction = async (pluginId: string, action: string, input: string) => {
        try {
            let parsedInput: any;
            try {
                parsedInput = input ? JSON.parse(input) : {};
            } catch (e) {
                setError('Invalid JSON input for action');
                return;
            }

            const result = await invoke('execute_plugin_action', {
                pluginId,
                action,
                input: parsedInput,
            });
            alert(`Action result: ${JSON.stringify(result, null, 2)}`);
        } catch (e) {
            setError(`Failed to execute action: ${e}`);
        }
    };

    const getPluginStatus = (pluginId: string) => {
        const plugin = pluginDetails[pluginId];
        if (!plugin) return 'Unknown';

        if (plugin.type === 'command') {
            return 'Active';
        }

        if (plugin.external_binary && !plugin.successful) {
            return plugin.install_instruction
                ? `Missing Binary (${plugin.install_instruction})`
                : 'Missing Binary';
        }

        return plugin.successful ? 'Active' : 'Inactive';
    };

    const getHostSupport = (hosts: string[]) => {
        if (!hosts || hosts.length === 0) return 'None';

        const wildcardHosts = hosts.filter(h => h.startsWith('*.'));
        const regularHosts = hosts.filter(h => !h.startsWith('*.'));

        if (regularHosts.length <= 3 && wildcardHosts.length <= 1) {
            return [...regularHosts, ...wildcardHosts].join(', ');
        }

        if (hosts.length > 3) {
            const displayedHosts = regularHosts.slice(0, 3);
            const wildcardSummary = wildcardHosts.length > 0 ? ' + Wildcards' : '';
            const moreCount = hosts.length - displayedHosts.length;
            const moreText = moreCount > 0 ? ` +${moreCount} more` : '';
            return `${displayedHosts.join(', ')}${wildcardSummary}${moreText}`;
        }

        return [...regularHosts, ...wildcardHosts].join(', ');
    };

    const renderStatusBadge = (status: string) => {
        let colorClass = 'badge badge-warning';
        let icon = null;

        if (status === 'Active') {
            colorClass = 'badge badge-success';
            icon = <FiCheck className="mr-1" />;
        } else if (status.startsWith('Missing Binary')) {
            colorClass = 'badge badge-error';
            icon = <FiX className="mr-1" />;
        }

        return (
            <span className={`inline-flex items-center ${colorClass}`}>
        {icon}
                {status}
      </span>
        );
    };

    const renderTypeBadge = (type?: string) => {
        const colorClass = type === 'script' ? 'badge badge-primary' : 'badge badge-secondary';

        return (
            <span className={colorClass}>
        {type || 'Unknown'}
      </span>
        );
    };

    const renderFunctionBadge = (func?: string) => {
        let colorClass = 'badge badge-accent';

        if (func === 'download') {
            colorClass = 'badge badge-success';
        } else if (func === 'translate') {
            colorClass = 'badge badge-warning';
        }

        return (
            <span className={colorClass}>
        {func || 'Unknown'}
      </span>
        );
    };

    const renderPluginManifestTemplate = () => {
        return `{
  "id": "plugin-id",
  "name": "Plugin Name",
  "version": "1.0.0",
  "supported_hosts": ["example.com"],
  "entry_point": "script.py",
  "type": "script",
  "plugin_function": "download",
  "supported_actions": ["download", "upload"],
  "external_binary": false,
  "language": "python",
  "install_instruction": "Install with: pip install plugin-package"
}`;
    };

    // Function to render the appropriate content based on loading and plugin state
    const renderPluginContent = () => {
        if (isLoading) {
            return (
                <div className="text-center py-10">
                    <span className="loading loading-spinner loading-lg"></span>
                    <p className="mt-3">Loading plugins...</p>
                </div>
            );
        }

        if (plugins.length === 0) {
            return <NoPluginsMessage />;
        }

        return (
            <PluginsTable
                plugins={plugins}
                pluginDetails={pluginDetails}
                renderTypeBadge={renderTypeBadge}
                renderFunctionBadge={renderFunctionBadge}
                getHostSupport={getHostSupport}
                renderStatusBadge={renderStatusBadge}
                getPluginStatus={getPluginStatus}
                handleRemovePlugin={handleRemovePlugin}
                handleTestAction={handleTestAction}
                setTestAction={setTestAction}
                setTestInput={setTestInput}
                testAction={testAction}
                testInput={testInput}
            />
        );
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Plugin Manager</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="btn btn-primary"
                    >
                        <FiPlus className="mr-1" /> Add Plugin
                    </button>
                    <button
                        onClick={handleImportPlugin}
                        className="btn btn-success"
                    >
                        <FiDownload className="mr-1" /> Import
                    </button>
                    <button
                        onClick={loadPlugins}
                        className="btn btn-neutral"
                    >
                        <FiRefreshCw className="mr-1" /> Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert-error mb-4">
                    <div className="flex-1">
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="btn btn-ghost btn-sm">
                        <FiX />
                    </button>
                </div>
            )}

            {showAddForm && (
                <div className="card bg-base-200 shadow-xl mb-6">
                    <div className="card-body">
                        <h2 className="card-title">Add New Plugin</h2>
                        <p className="text-sm text-base-content/70">
                            Paste the plugin manifest JSON below:
                        </p>
                        <textarea
                            value={newPluginManifest}
                            onChange={(e) => setNewPluginManifest(e.target.value)}
                            className="textarea textarea-bordered w-full h-64 font-mono text-sm"
                            placeholder={renderPluginManifestTemplate()}
                        />
                        <div className="card-actions justify-end">
                            <button
                                onClick={() => setShowAddForm(false)}
                                className="btn btn-neutral"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddPlugin}
                                className="btn btn-primary"
                            >
                                Add Plugin
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {renderPluginContent()}
        </div>
    );
};

export default PluginManager;