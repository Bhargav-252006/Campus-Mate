import React, {useState, useEffect} from 'react';
import {
    Library, Plus, Trash2, Edit2, Save, X, ExternalLink,
    Search, Filter, Folder, Video, FileText, Link as LinkIcon,
    BookOpen, Youtube, Globe, Star, StarOff, Tag
} from 'lucide-react';
import {useToast} from '../context/ToastContext';

const RESOURCE_TYPES = {
    link: {icon: LinkIcon, label: 'Link', color: '#4a9eff'},
    video: {icon: Youtube, label: 'Video', color: '#ff4a4a'},
    article: {icon: FileText, label: 'Article', color: '#4aff91'},
    pdf: {icon: FileText, label: 'PDF', color: '#ff9f4a'},
    course: {icon: BookOpen, label: 'Course', color: '#c44aff'},
    other: {icon: Globe, label: 'Other', color: '#888'}
};

const ResourceLibrary = () => {
    const toast = useToast();
    const [resources, setResources] = useState([]);
    const [folders, setFolders] = useState([]);
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [editingResource, setEditingResource] = useState(null);

    const [newResource, setNewResource] = useState({
        title: '',
        url: '',
        type: 'link',
        description: '',
        tags: [],
        folderId: null,
        favorite: false
    });

    const [newFolder, setNewFolder] = useState({name: '', color: '#4a9eff'});
    const [tagInput, setTagInput] = useState('');

    // Load data
    useEffect(() => {
        const savedResources = localStorage.getItem('resourceLibrary');
        const savedFolders = localStorage.getItem('resourceFolders');
        if (savedResources) setResources(JSON.parse(savedResources));
        if (savedFolders) setFolders(JSON.parse(savedFolders));
    }, []);

    // Save functions
    const saveResources = (newResources) => {
        setResources(newResources);
        localStorage.setItem('resourceLibrary', JSON.stringify(newResources));
    };

    const saveFolders = (newFolders) => {
        setFolders(newFolders);
        localStorage.setItem('resourceFolders', JSON.stringify(newFolders));
    };

    // Detect resource type from URL
    const detectType = (url) => {
        if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com')) {
            return 'video';
        }
        if (url.endsWith('.pdf')) {
            return 'pdf';
        }
        if (url.includes('coursera.org') || url.includes('udemy.com') || url.includes('edx.org')) {
            return 'course';
        }
        if (url.includes('medium.com') || url.includes('dev.to') || url.includes('blog')) {
            return 'article';
        }
        return 'link';
    };

    // Add resource
    const addResource = () => {
        if (!newResource.title.trim() || !newResource.url.trim()) {
            toast.warning('Title and URL are required');
            return;
        }

        const resource = {
            id: Date.now(),
            ...newResource,
            type: newResource.type || detectType(newResource.url),
            folderId: selectedFolder,
            createdAt: new Date().toISOString()
        };

        saveResources([resource, ...resources]);
        setNewResource({
            title: '',
            url: '',
            type: 'link',
            description: '',
            tags: [],
            folderId: null,
            favorite: false
        });
        setTagInput('');
        setShowAddModal(false);
        toast.success('Resource added!');
    };

    // Update resource
    const updateResource = () => {
        if (!editingResource.title.trim() || !editingResource.url.trim()) {
            toast.warning('Title and URL are required');
            return;
        }

        const updated = resources.map(r =>
            r.id === editingResource.id ? {...editingResource, updatedAt: new Date().toISOString()} : r
        );
        saveResources(updated);
        setEditingResource(null);
        toast.success('Resource updated!');
    };

    // Delete resource
    const deleteResource = (id) => {
        if (!window.confirm('Delete this resource?')) return;
        saveResources(resources.filter(r => r.id !== id));
        toast.info('Resource deleted');
    };

    // Toggle favorite
    const toggleFavorite = (id) => {
        const updated = resources.map(r =>
            r.id === id ? {...r, favorite: !r.favorite} : r
        );
        saveResources(updated);
    };

    // Add folder
    const addFolder = () => {
        if (!newFolder.name.trim()) {
            toast.warning('Folder name is required');
            return;
        }

        const folder = {
            id: Date.now(),
            ...newFolder,
            createdAt: new Date().toISOString()
        };

        saveFolders([...folders, folder]);
        setNewFolder({name: '', color: '#4a9eff'});
        setShowFolderModal(false);
        toast.success('Folder created!');
    };

    // Delete folder
    const deleteFolder = (id) => {
        if (!window.confirm('Delete this folder? Resources will be moved to All.')) return;

        // Move resources to root
        const updated = resources.map(r =>
            r.folderId === id ? {...r, folderId: null} : r
        );
        saveResources(updated);
        saveFolders(folders.filter(f => f.id !== id));

        if (selectedFolder === id) setSelectedFolder(null);
        toast.info('Folder deleted');
    };

    // Add tag
    const addTag = () => {
        if (tagInput.trim() && !newResource.tags.includes(tagInput.trim())) {
            setNewResource({
                ...newResource,
                tags: [...newResource.tags, tagInput.trim()]
            });
            setTagInput('');
        }
    };

    // Filter resources
    const filteredResources = resources.filter(r => {
        // Folder filter
        if (selectedFolder !== null && r.folderId !== selectedFolder) return false;

        // Type filter
        if (filterType !== 'all' && r.type !== filterType) return false;

        // Favorites filter
        if (showFavoritesOnly && !r.favorite) return false;

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            return (
                r.title.toLowerCase().includes(term) ||
                r.description?.toLowerCase().includes(term) ||
                r.tags?.some(t => t.toLowerCase().includes(term))
            );
        }

        return true;
    });

    // Get all unique tags
    const allTags = [...new Set(resources.flatMap(r => r.tags || []))];

    return (
        <div className="resources-page resource-library">
            <div className="page-header">
                <div>
                    <h1><Library size={28} /> Resource Library</h1>
                    <p className="subtitle">Save and organize your learning resources</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={() => setShowFolderModal(true)}>
                        <Folder size={20} /> New Folder
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                        <Plus size={20} /> Add Resource
                    </button>
                </div>
            </div>

            <div className="resources-layout resource-layout">
                {/* Sidebar */}
                <div className="resources-sidebar folders-sidebar">
                    <div
                        className={`folder-item ${selectedFolder === null ? 'active' : ''}`}
                        onClick={() => setSelectedFolder(null)}
                    >
                        <Library size={18} />
                        <span>All Resources</span>
                        <span className="count">{resources.length}</span>
                    </div>

                    <div
                        className={`folder-item favorites ${showFavoritesOnly ? 'active' : ''}`}
                        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    >
                        <Star size={18} />
                        <span>Favorites</span>
                        <span className="count">{resources.filter(r => r.favorite).length}</span>
                    </div>

                    <div className="divider" />

                    <div className="folders-section">
                        <h4>Folders</h4>
                        {folders.map(folder => (
                            <div
                                key={folder.id}
                                className={`folder-item ${selectedFolder === folder.id ? 'active' : ''}`}
                            >
                                <div
                                    className="folder-content"
                                    onClick={() => setSelectedFolder(folder.id)}
                                >
                                    <Folder size={18} style={{color: folder.color}} />
                                    <span>{folder.name}</span>
                                    <span className="count">
                                        {resources.filter(r => r.folderId === folder.id).length}
                                    </span>
                                </div>
                                <button
                                    className="delete-folder"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteFolder(folder.id);
                                    }}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main content */}
                <div className="resources-main">
                    {/* Search and filters */}
                    <div className="resources-toolbar resource-toolbar">
                        <div className="search-box">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Search resources..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="type-filters">
                            <button
                                className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
                                onClick={() => setFilterType('all')}
                            >
                                All
                            </button>
                            {Object.entries(RESOURCE_TYPES).map(([key, {label}]) => (
                                <button
                                    key={key}
                                    className={`filter-btn ${filterType === key ? 'active' : ''}`}
                                    onClick={() => setFilterType(key)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Resources grid */}
                    {filteredResources.length === 0 ? (
                        <div className="empty-state">
                            <Library size={64} />
                            <h3>No resources found</h3>
                            <p>
                                {searchTerm || filterType !== 'all' || selectedFolder
                                    ? 'Try adjusting your filters'
                                    : 'Add your first resource to get started!'
                                }
                            </p>
                            {!searchTerm && filterType === 'all' && !selectedFolder && (
                                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                                    <Plus size={20} /> Add Resource
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="resources-grid resource-grid">
                            {filteredResources.map(resource => {
                                const TypeIcon = RESOURCE_TYPES[resource.type]?.icon || Globe;
                                const typeColor = RESOURCE_TYPES[resource.type]?.color || '#888';

                                return (
                                    <div key={resource.id} className="resource-card">
                                        <div className="resource-header">
                                            <div className="type-badge" style={{background: typeColor}}>
                                                <TypeIcon size={14} />
                                                {RESOURCE_TYPES[resource.type]?.label || resource.type}
                                            </div>
                                            <button
                                                className={`favorite-btn ${resource.favorite ? 'active' : ''}`}
                                                onClick={() => toggleFavorite(resource.id)}
                                            >
                                                {resource.favorite ? <Star size={18} /> : <StarOff size={18} />}
                                            </button>
                                        </div>

                                        <h3 className="resource-title">{resource.title}</h3>

                                        {resource.description && (
                                            <p className="resource-desc">{resource.description}</p>
                                        )}

                                        {resource.tags?.length > 0 && (
                                            <div className="resource-tags">
                                                {resource.tags.map(tag => (
                                                    <span key={tag} className="tag">
                                                        <Tag size={12} /> {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="resource-actions">
                                            <a
                                                href={resource.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-primary btn-sm"
                                            >
                                                <ExternalLink size={14} /> Open
                                            </a>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => setEditingResource(resource)}
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => deleteResource(resource.id)}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Add Resource Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add New Resource</h2>
                            <button className="close-btn" onClick={() => setShowAddModal(false)} aria-label="Close">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="modal-body">

                            <div className="form-group">
                                <label>Title *</label>
                                <input
                                    type="text"
                                    value={newResource.title}
                                    onChange={e => setNewResource({...newResource, title: e.target.value})}
                                    placeholder="Resource title"
                                />
                            </div>

                            <div className="form-group">
                                <label>URL *</label>
                                <input
                                    type="url"
                                    value={newResource.url}
                                    onChange={e => setNewResource({
                                        ...newResource,
                                        url: e.target.value,
                                        type: detectType(e.target.value)
                                    })}
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Type</label>
                                    <select
                                        value={newResource.type}
                                        onChange={e => setNewResource({...newResource, type: e.target.value})}
                                    >
                                        {Object.entries(RESOURCE_TYPES).map(([key, {label}]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Folder</label>
                                    <select
                                        value={newResource.folderId || ''}
                                        onChange={e => setNewResource({
                                            ...newResource,
                                            folderId: e.target.value ? parseInt(e.target.value) : null
                                        })}
                                    >
                                        <option value="">None</option>
                                        {folders.map(f => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={newResource.description}
                                    onChange={e => setNewResource({...newResource, description: e.target.value})}
                                    placeholder="Optional description"
                                    rows={3}
                                />
                            </div>

                            <div className="form-group">
                                <label>Tags</label>
                                <div className="tag-input">
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                        placeholder="Add tags..."
                                        list="existing-tags"
                                    />
                                    <datalist id="existing-tags">
                                        {allTags.map(t => <option key={t} value={t} />)}
                                    </datalist>
                                    <button className="btn btn-sm" onClick={addTag}>Add</button>
                                </div>
                                <div className="tags-list">
                                    {newResource.tags.map(tag => (
                                        <span key={tag} className="tag">
                                            {tag}
                                            <button onClick={() => setNewResource({
                                                ...newResource,
                                                tags: newResource.tags.filter(t => t !== tag)
                                            })}>
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>
                                    Cancel
                                </button>
                                <button className="btn btn-primary" onClick={addResource}>
                                    Add Resource
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Resource Modal */}
            {editingResource && (
                <div className="modal-overlay" onClick={() => setEditingResource(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit Resource</h2>
                            <button className="close-btn" onClick={() => setEditingResource(null)} aria-label="Close">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="modal-body">

                            <div className="form-group">
                                <label>Title *</label>
                                <input
                                    type="text"
                                    value={editingResource.title}
                                    onChange={e => setEditingResource({...editingResource, title: e.target.value})}
                                />
                            </div>

                            <div className="form-group">
                                <label>URL *</label>
                                <input
                                    type="url"
                                    value={editingResource.url}
                                    onChange={e => setEditingResource({...editingResource, url: e.target.value})}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Type</label>
                                    <select
                                        value={editingResource.type}
                                        onChange={e => setEditingResource({...editingResource, type: e.target.value})}
                                    >
                                        {Object.entries(RESOURCE_TYPES).map(([key, {label}]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Folder</label>
                                    <select
                                        value={editingResource.folderId || ''}
                                        onChange={e => setEditingResource({
                                            ...editingResource,
                                            folderId: e.target.value ? parseInt(e.target.value) : null
                                        })}
                                    >
                                        <option value="">None</option>
                                        {folders.map(f => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={editingResource.description || ''}
                                    onChange={e => setEditingResource({...editingResource, description: e.target.value})}
                                    rows={3}
                                />
                            </div>

                            <div className="modal-actions">
                                <button className="btn btn-ghost" onClick={() => setEditingResource(null)}>
                                    Cancel
                                </button>
                                <button className="btn btn-primary" onClick={updateResource}>
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Folder Modal */}
            {showFolderModal && (
                <div className="modal-overlay" onClick={() => setShowFolderModal(false)}>
                    <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Create Folder</h2>
                            <button className="close-btn" onClick={() => setShowFolderModal(false)} aria-label="Close">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="modal-body">

                            <div className="form-group">
                                <label>Folder Name</label>
                                <input
                                    type="text"
                                    value={newFolder.name}
                                    onChange={e => setNewFolder({...newFolder, name: e.target.value})}
                                    placeholder="e.g., Mathematics"
                                />
                            </div>

                            <div className="form-group">
                                <label>Color</label>
                                <div className="color-picker">
                                    {['#4a9eff', '#ff4a4a', '#4aff91', '#ff9f4a', '#c44aff', '#ffea4a', '#4afff4', '#ff4a91'].map(color => (
                                        <button
                                            key={color}
                                            className={`color-btn ${newFolder.color === color ? 'active' : ''}`}
                                            style={{background: color}}
                                            onClick={() => setNewFolder({...newFolder, color})}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button className="btn btn-ghost" onClick={() => setShowFolderModal(false)}>
                                    Cancel
                                </button>
                                <button className="btn btn-primary" onClick={addFolder}>
                                    Create Folder
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResourceLibrary;
