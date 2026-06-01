import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import API from '../services/api';

export default function Dashboard() {
    const { logoutSession } = useContext(AuthContext);

    // State variables for matching tracking metadata schemas
    const [project, setProject] = useState(null);
    const [activeAlgo, setActiveAlgo] = useState('');
    const [uploading, setUploading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // 1. Ingestion Event Handlers: Piping raw buffers straight to Multer/Cloudinary API
    const handleImageIngestion = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        setUploading(true);
        setErrorMsg('');
        setStatusMsg('Streaming binary fragments to Cloud CDN...');

        try {
            const res = await API.post('/images/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (res.data.success) {
                setProject(res.data.project);
                setActiveAlgo('');
                setStatusMsg('Asset logged successfully to MongoDB Atlas.');
            }
        } catch (err) {
            setErrorMsg(err.response?.data?.message || 'Inbound file routing failure.');
        } finally {
            setUploading(false);
        }
    };

    // 2. Compute Bridge Trigger: Launching the Python Child Thread Matrix math loop
    const handleExecuteTransformation = async (algoName) => {
        if (!project) return setErrorMsg('Upload an image asset to activate computing.');

        setProcessing(true);
        setActiveAlgo(algoName);
        setErrorMsg('');
        setStatusMsg(`Spawning Python worker thread for ${algoName}...`);

        try {
            const res = await API.post('/process/transform', {
                projectId: project._id,
                algorithm: algoName,
            });
            if (res.data.success) {
                setProject(res.data.project);
                setStatusMsg('NumPy transformation loop complete.');
            }
        } catch (err) {
            setErrorMsg(err.response?.data?.message || 'Python compute thread runtime crash.');
        } finally {
            setProcessing(false);
        }
    };

    // Helper formatting calculation values for frontend analytics cards
    const calculateRatio = () => {
        if (!project?.metadata?.compressedSizeInBytes) return 'N/A';
        return (project.metadata.fileSizeInBytes / project.metadata.compressedSizeInBytes).toFixed(2) + ' : 1';
    };

    const calculateSpaceSaved = () => {
        if (!project?.metadata?.compressedSizeInBytes) return '0%';
        const orig = project.metadata.fileSizeInBytes;
        const comp = project.metadata.compressedSizeInBytes;
        return (((orig - comp) / orig) * 100).toFixed(1) + '%';
    };

    return (
        <div className="dashboard-root">
            {/* PANEL 1: THE CONTROL TOWER SIDEBAR */}
            <aside className="control-sidebar">
                <div className="brand-section">
                    <h1 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--brand-cyan)' }}>Pixel Lab</h1>
                    <button onClick={logoutSession} className="btn-secondary">Exit Session</button>
                </div>

                {/* Dynamic Navigation Map over our 3 Syllabus Suites */}
                <div className="suite-category">
                    <h3 className="suite-title">Image Enhancement</h3>
                    <div className="algo-list">
                        {['CONTRAST_STRETCHING', 'HISTOGRAM_EQUALIZATION', 'CLAHE', 'GAMMA_CORRECTION'].map((algo) => (
                            <button
                                key={algo}
                                disabled={processing || !project}
                                className={`algo-btn ${activeAlgo === algo ? 'active' : ''}`}
                                onClick={() => handleExecuteTransformation(algo)}
                            >
                                {algo.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="suite-category">
                    <h3 className="suite-title">Image Restoration</h3>
                    <div className="algo-list">
                        {['MEAN_FILTER', 'MEDIAN_FILTER', 'INVERSE_FILTER', 'WIENER_FILTER'].map((algo) => (
                            <button
                                key={algo}
                                disabled={processing || !project}
                                className={`algo-btn ${activeAlgo === algo ? 'active' : ''}`}
                                onClick={() => handleExecuteTransformation(algo)}
                            >
                                {algo.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="suite-category">
                    <h3 className="suite-title">Encoding & Compression</h3>
                    <div className="algo-list">
                        {['HUFFMAN_CODING', 'ARITHMETIC_CODING', 'LZW_COMPRESSION'].map((algo) => (
                            <button
                                key={algo}
                                disabled={processing || !project}
                                className={`algo-btn ${activeAlgo === algo ? 'active' : ''}`}
                                onClick={() => handleExecuteTransformation(algo)}
                            >
                                {algo.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>
            </aside>

            {/* PANEL 2: CORE CANVAS VIEWPORT */}
            <main className="canvas-viewport">
                {errorMsg && <div className="alert-danger">{errorMsg}</div>}
                {statusMsg && <div className="alert-success">{statusMsg}</div>}

                {!project ? (
                    <label className="dropzone-container">
                        <input type="file" accept="image/*" onChange={handleImageIngestion} style={{ display: 'none' }} />
                        <span style={{ fontSize: '36px', marginBottom: '12px' }}>📥</span>
                        <p style={{ fontSize: '15px', fontWeight: '600' }}>Drag & Drop or Click to Ingest Graphic Matrix</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Supports PNG, JPG up to 2MB</p>
                    </label>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                                Active Document: <strong style={{ color: '#fff' }}>{project.originalName}</strong>
                            </span>
                            <button onClick={() => setProject(null)} className="btn-secondary" style={{ backgroundColor: '#dc2626' }}>
                                Clear Project Workspace
                            </button>
                        </div>

                        <div className="comparison-grid">
                            <div className="image-frame">
                                <span className="frame-label">Raw Input Layer</span>
                                <img src={project.originalUrl} alt="Original" className="display-img" />
                            </div>

                            <div className="image-frame">
                                <span className="frame-label">Python Computed Matrix Output</span>
                                {project.processedUrl ? (
                                    <img src={project.processedUrl} alt="Processed" className="display-img" />
                                ) : (
                                    <div className="empty-processed-placeholder">
                                        {processing ? 'NumPy matrix threads executing recalculations...' : 'Select a mathematical algorithm suite on the left sidebar to execute calculation layers.'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* PANEL 3: ANALYTICS HUD READOUT CARD */}
            <aside className="analytics-sidebar">
                <div>
                    <h2 className="panel-header">Matrix Dimensional Data</h2>
                    <div className="metric-card" style={{ marginTop: '10px' }}>
                        <div className="metric-row">
                            <span>Resolution Width</span>
                            <span className="metric-val">{project?.metadata?.width ? `${project.metadata.width} px` : 'N/A'}</span>
                        </div>
                        <div className="metric-row">
                            <span>Resolution Height</span>
                            <span className="metric-val">{project?.metadata?.height ? `${project.metadata.height} px` : 'N/A'}</span>
                        </div>
                        <div className="metric-row">
                            <span>Raw Byte Envelope</span>
                            <span className="metric-val">{project?.metadata?.fileSizeInBytes ? `${(project.metadata.fileSizeInBytes / 1024).toFixed(1)} KB` : 'N/A'}</span>
                        </div>
                    </div>
                </div>

                <div>
                    <h2 className="panel-header">Execution Profiler</h2>
                    <div className="metric-card" style={{ marginTop: '10px' }}>
                        <div className="metric-row">
                            <span>Pipeline Active Technique</span>
                            <span className="metric-val" style={{ color: 'var(--brand-success)' }}>{project?.techniqueApplied || 'NONE'}</span>
                        </div>
                        <div className="metric-row">
                            <span>Python Clock Cycle Runtime</span>
                            <span className="metric-val" style={{ color: '#fbbf24' }}>{project?.metadata?.processingTimeMs ? `${project.metadata.processingTimeMs} ms` : '0.00 ms'}</span>
                        </div>
                    </div>
                </div>

                <div>
                    <h2 className="panel-header">Compression Analytics</h2>
                    <div className="metric-card" style={{ marginTop: '10px' }}>
                        <div className="metric-row">
                            <span>Entropy Code Footprint</span>
                            <span className="metric-val">{project?.metadata?.compressedSizeInBytes ? `${(project.metadata.compressedSizeInBytes / 1024).toFixed(1)} KB` : 'N/A'}</span>
                        </div>
                        <div className="metric-row">
                            <span>Compression Ratio (CR)</span>
                            <span className="metric-val" style={{ color: 'var(--brand-success)' }}>{calculateRatio()}</span>
                        </div>
                        <div className="metric-row">
                            <span>Storage Margin Saved</span>
                            <span className="metric-val" style={{ color: 'var(--brand-cyan)' }}>{calculateSpaceSaved()}</span>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    );
}