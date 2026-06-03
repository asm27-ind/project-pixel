import { useDipEngine } from '../hooks/useDipEngine';
import { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import AnalyticsPanel from '../components/AnalyticsPanel';

export default function Dashboard() {
    const { logoutSession } = useContext(AuthContext);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const {
        project,
        activeAlgo,
        processing,
        statusMsg,
        errorMsg,
        processUpload,
        executeTransformation,
        clearWorkspace,
        downloadImage,
    } = useDipEngine();

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) processUpload(file);
    };

    return (
        <div className={`dashboard-root ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <Sidebar
                processing={processing}
                project={project}
                activeAlgo={activeAlgo}
                onExecute={executeTransformation}
                onLogout={logoutSession}
            />

            <main className="canvas-viewport">
                {errorMsg && <div className="alert-danger">{errorMsg}</div>}
                {statusMsg && <div className="alert-success">{statusMsg.replace(/Executing computational transformations for/g, 'Applying filter:').replace(/Processing complete. Workspace synchronized./g, 'Filters applied successfully!')}</div>}

                {!project ? (
                    <label className="dropzone-container">
                        <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                        <span style={{ fontSize: '36px', marginBottom: '12px' }}>📥</span>
                        <p style={{ fontSize: '15px', fontWeight: '600' }}>Click to Upload Image File</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Supports images up to 2MB</p>
                    </label>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <button 
                                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
                                    className="btn-secondary" 
                                    style={{ marginRight: '12px', fontSize: '12px', backgroundColor: 'var(--brand-cyan, #0ea5e9)', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <span>{sidebarCollapsed ? '➡️' : '⬅️'}</span>
                                    <span>{sidebarCollapsed ? 'Show Tools' : 'Hide Tools'}</span>
                                </button>
                                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                                    Selected Image: <strong style={{ color: '#fff' }}>{project.originalName}</strong>
                                </span>
                            </div>
                            <button onClick={clearWorkspace} className="btn-secondary" style={{ backgroundColor: '#dc2626' }}>
                                Clear Workspace
                            </button>
                        </div>

                        <div className="comparison-grid">
                            <div className="image-frame">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span className="frame-label">Original Image</span>
                                    <button
                                        onClick={() => downloadImage(project.originalUrl, `original-${project.originalName}`)}
                                        className="btn-secondary"
                                        style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: 'var(--brand-cyan, #0ea5e9)' }}
                                    >
                                        💾 Download Original
                                    </button>
                                </div>
                                <img src={project.originalUrl} alt="Original" className="display-img" />
                            </div>

                            <div className="image-frame">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span className="frame-label">Processed Image</span>
                                    {project.processedUrl && (
                                        <button
                                            onClick={() => downloadImage(project.processedUrl, `${project.techniqueApplied.toLowerCase()}-${project.originalName}`)}
                                            className="btn-secondary"
                                            style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: 'var(--brand-success, #10b981)' }}
                                        >
                                            📥 Download Output
                                        </button>
                                    )}
                                </div>
                                {project.processedUrl ? (
                                    <img src={project.processedUrl} alt="Processed" className="display-img" />
                                ) : (
                                    <div className="empty-processed-placeholder">
                                        {processing ? (
                                            'Processing image, please wait...'
                                        ) : (
                                            'Select a filter or tool on the left tools panel to execute.'
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <AnalyticsPanel project={project} />
        </div>
    );
}
