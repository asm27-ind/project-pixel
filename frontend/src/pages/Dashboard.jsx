import { useDipEngine } from '../hooks/useDipEngine';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import AnalyticsPanel from '../components/AnalyticsPanel';

export default function Dashboard() {
    const { logoutSession } = useContext(AuthContext);
    const {
        project,
        activeAlgo,
        processing,
        statusMsg,
        errorMsg,
        processUpload,
        executeTransformation,
        clearWorkspace,
    } = useDipEngine();

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) processUpload(file);
    };

    return (
        <div className="dashboard-root">
            <Sidebar
                processing={processing}
                project={project}
                activeAlgo={activeAlgo}
                onExecute={executeTransformation}
                onLogout={logoutSession}
            />

            <main className="canvas-viewport">
                {errorMsg && <div className="alert-danger">{errorMsg}</div>}
                {statusMsg && <div className="alert-success">{statusMsg}</div>}

                {!project ? (
                    <label className="dropzone-container">
                        <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                        <span style={{ fontSize: '36px', marginBottom: '12px' }}>📥</span>
                        <p style={{ fontSize: '15px', fontWeight: '600' }}>Click to Ingest Graphic Matrix Asset</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Supports image layouts up to 2MB</p>
                    </label>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                                Active Document Matrix: <strong style={{ color: '#fff' }}>{project.originalName}</strong>
                            </span>
                            <button onClick={clearWorkspace} className="btn-secondary" style={{ backgroundColor: '#dc2626' }}>
                                Clear Workspace
                            </button>
                        </div>

                        <div className="comparison-grid">
                            <div className="image-frame">
                                <span className="frame-label">Raw Input Matrix Layer</span>
                                <img src={project.originalUrl} alt="Original" className="display-img" />
                            </div>

                            <div className="image-frame">
                                <span className="frame-label">Python Computed Output Array</span>
                                {project.processedUrl ? (
                                    <img src={project.processedUrl} alt="Processed" className="display-img" />
                                ) : (
                                    <div className="empty-processed-placeholder">
                                        {processing ? 'NumPy execution threads calculating matrix values...' : 'Select a mathematical technique on the left panel to execute computing layers.'}
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